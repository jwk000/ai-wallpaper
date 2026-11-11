'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const { Tracker, tokenize } = require('./core.cjs');

function createCollector({ dataDir, input, token = crypto.randomBytes(24).toString('hex'), port = 18767 }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const filename = path.join(dataDir, 'frequencies.json');
  let words = new Map(), revision = 0, paused = false, status = '等待支持的输入框', lastSample = 0, dirty = false;
  try { words = new Map(JSON.parse(fs.readFileSync(filename, 'utf8')).filter(x => Array.isArray(x) && typeof x[0] === 'string' && x[0].length <= 24 && Number.isSafeInteger(x[1]) && x[1] > 0).slice(0,10000)); }
  catch (e) { if (e.code !== 'ENOENT') console.warn('词频文件不可读，本次从空记录开始。'); }
  const tracker = new Tracker(text => {
    for (const word of tokenize(text)) if (words.has(word) || words.size < 10000) words.set(word, (words.get(word) || 0) + 1);
    revision++; dirty = true;
  });
  const lines = readline.createInterface({ input });
  lines.on('line', line => {
    try {
      const sample = JSON.parse(line); lastSample = Date.now();
      status = sample.supported ? '系统输入 · 正在统计' : '当前输入框不支持或受保护';
      if (!paused) tracker.sample(sample);
    } catch { /* Ignore a malformed sample; never log its text. */ }
  });
  lines.on('close', () => { status = '采集进程已停止'; lastSample = 0; });
  function persist() {
    if (!dirty) return;
    try { fs.writeFileSync(filename + '.tmp', JSON.stringify([...words]), { mode: 0o600 }); fs.renameSync(filename + '.tmp', filename); dirty = false; }
    catch { status = '词频保存失败；请检查存储空间'; }
  }
  const timer = setInterval(persist, 2000);
  const server = http.createServer((req, res) => {
    // Bind only to loopback; reject DNS rebinding and arbitrary website origins.
    if (req.headers.host !== `127.0.0.1:${server.address().port}`) { res.writeHead(403).end(); return; }
    const origin = req.headers.origin;
    if (origin && origin !== 'null' && origin !== `http://127.0.0.1:${server.address().port}`) { res.writeHead(403).end(); return; }
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin'); }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods','GET, POST');
      res.setHeader('Access-Control-Allow-Headers','Authorization');
      res.setHeader('Access-Control-Allow-Private-Network','true');
      res.writeHead(204).end(); return;
    }
    if (req.method === 'GET' && req.url === '/') {
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end(fs.readFileSync(path.join(__dirname,'../wallpaper.html'))); return;
    }
    if (req.headers.authorization !== 'Bearer ' + token) { res.writeHead(401).end(); return; }
    if (req.method === 'GET' && req.url === '/api/snapshot') {
      res.setHeader('Content-Type','application/json; charset=utf-8');
      res.end(JSON.stringify({ revision, paused, status: Date.now()-lastSample>4000?'采集器无响应':status, words:[...words] })); return;
    }
    if (req.method === 'POST' && ['/api/pause','/api/resume','/api/clear'].includes(req.url)) {
      if (req.url === '/api/pause') paused = true;
      if (req.url === '/api/resume') paused = false;
      if (req.url === '/api/clear') { words.clear(); revision++; dirty = true; persist(); }
      tracker.reset(); res.writeHead(204).end(); return;
    }
    res.writeHead(404).end();
  });
  return { server, token, listen: () => new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',resolve); }), close: () => { clearInterval(timer); persist(); lines.close(); return new Promise(resolve => server.close(resolve)); } };
}

async function main() {
  const dataDir = path.join(process.env.LOCALAPPDATA || process.env.HOME, 'Lumen', 'word-cloud');
  const tokenFile = path.join(dataDir, 'connection-token');
  fs.mkdirSync(dataDir, { recursive: true });
  let token; try { token = fs.readFileSync(tokenFile,'utf8').trim(); } catch {}
  if (!/^[a-f0-9]{48}$/.test(token || '')) { token = crypto.randomBytes(24).toString('hex'); fs.writeFileSync(tokenFile,token,{mode:0o600}); }
  const exe = path.join(dataDir, 'InputReader.exe');
  if (!fs.existsSync(exe)) throw Error('采集器尚未编译，请运行「启动输入统计.cmd」。');
  // Start the process only after successfully binding the port, so a second launcher cannot duplicate capture.
  const { PassThrough } = require('node:stream');
  const input = new PassThrough();
  const collector = createCollector({ dataDir, input, token });
  await collector.listen();
  const child = spawn(exe, [String(process.pid)], { windowsHide: true, stdio: ['ignore','pipe','pipe'] });
  child.stdout.pipe(input); child.stderr.resume();
  child.on('error', () => { console.error('无法启动文字读取进程。'); input.end(); });
  child.on('exit', () => { input.end(); console.error('文字读取进程已退出；请关闭窗口后重新启动。'); });
  console.log('\n字海 · Windows 本地输入统计\n');
  console.log('已启动。仅支持提供 UI Automation 文本的输入框，密码框跳过。');
  console.log('统计是近似值：停顿确认、焦点切换、应用兼容性可能造成漏计或误计。');
  console.log('只保存词频，不保存句子。关闭此窗口或 Ctrl+C 停止采集。\n');
  console.log('连接口令：\n' + token);
  console.log('\n预览地址（含连接口令，仅本机使用）：\nhttp://127.0.0.1:18767/#token=' + token);
  console.log('\n数据目录：' + dataDir + '\n');
  const stop = async () => { child.kill(); await collector.close(); process.exit(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  process.on('exit', () => child.kill());
}
if (require.main === module) main().catch(e => { console.error('启动失败：' + e.message); process.exit(1); });
module.exports = { createCollector };
