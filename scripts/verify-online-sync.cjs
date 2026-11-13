'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const { app, BrowserWindow } = require('electron');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-sync-check-'));
  const library = path.join(profile, 'wallpapers');
  fs.mkdirSync(path.join(library, 'local-art'), { recursive: true });
  fs.writeFileSync(path.join(library, 'local-art/wallpaper.html'), '<!doctype html><title>本机作品</title><canvas></canvas>');
  const preview = fs.readFileSync(path.join(root, 'site/assets/wallpapers/ink-lotus/preview.jpg'));
  fs.writeFileSync(path.join(library, 'local-art/preview.jpg'), preview);
  fs.writeFileSync(path.join(profile, 'config.json'), JSON.stringify({ autoCheckUpdates: false }));
  const treeHash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(library, 'local-art/wallpaper.html'))).update(fs.readFileSync(path.join(library, 'local-art/preview.jpg'))).digest('hex');
  const originalHash = treeHash();
  const requests = [];
  let fail = true, generation = 1;
  const item = (id) => ({ id, title: `在线作品 ${id}`, tags: ['自然'], preview: 'preview.jpg', download: 'download.jpg', width: 1920, height: 1080 });
  const server = http.createServer(async (req, res) => {
    requests.push(req.url);
    if (req.url.startsWith('/data/wallpapers.json')) {
      await wait(300);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      if (fail) { res.writeHead(503).end('unavailable'); return; }
      // Keep updatedAt unchanged: manual sync must still retrieve fresh content.
      res.end(JSON.stringify({ updatedAt: '2026-11-13', wallpapers: Array.from({ length: generation + 1 }, (_, i) => item(String(i + 1))) }));
      return;
    }
    if (req.url.startsWith('/preview.jpg') || req.url.startsWith('/download.jpg')) { res.setHeader('Content-Type', 'image/jpeg'); res.end(preview); return; }
    res.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.LUMEN_USER_DATA_DIR = profile;
  process.env.LUMEN_WALLPAPERS_DIR = library;
  process.env.LUMEN_SITE_URL = `http://127.0.0.1:${server.address().port}/`;
  app.getAppPath = () => root;
  app.getVersion = () => require('../package.json').version;
  BrowserWindow.prototype.show = function () {};
  app.on('browser-window-created', (_, win) => win.webContents.setBackgroundThrottling(false));
  require('../src/main/index');
  const until = async (predicate, label) => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) { if (await predicate()) return; await wait(50); }
    throw new Error(`Timed out: ${label}`);
  };
  await until(() => BrowserWindow.getAllWindows().some(win => win.webContents.getURL().endsWith('/index.html') && !win.webContents.isLoading()), 'library startup');
  const win = BrowserWindow.getAllWindows()[0];
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  const js = code => win.webContents.executeJavaScript(code);
  await until(() => js('Boolean(state)'), 'initial state');
  const count = () => requests.filter(url => url.startsWith('/data/')).length;
  const sync = async () => {
    await js("document.getElementById('syncOnlineBtn').click()");
    assert.equal(await js("document.getElementById('syncOnlineBtn').disabled"), true);
    assert.equal(await js("document.getElementById('syncOnlineBtn').getAttribute('aria-busy')"), 'true');
    await js("document.getElementById('syncOnlineBtn').click(); syncOnlineCatalog()");
    await until(() => js("!document.getElementById('syncOnlineBtn').disabled"), 'sync finish');
  };
  try {
    assert.equal(count(), 0, 'Startup in local mode should not fetch the catalog');
    await sync();
    assert.equal(count(), 1, 'Repeated clicks should not duplicate a request');
    assert.equal(await js('sourceMode'), 'online');
    assert.equal(await js('online.status'), 'error');
    assert.equal(await js("document.getElementById('syncOnlineLabel').textContent"), '重试同步');
    assert.equal(await js('state.wallpapers.length'), 1);
    fail = false;
    await sync();
    assert.equal(count(), 2);
    assert.equal(await js('online.items.length'), 2);
    assert.match(await js("document.getElementById('sourceStatusText').textContent"), /已同步 2 幅/);
    assert.match(await js("document.getElementById('sourceStatusText').title"), /最近成功同步/);
    const cached = await js('api.getOnlineCatalog(false)');
    assert.equal(cached.cached, true);
    assert.equal(count(), 2, 'Normal browsing should reuse the in-memory catalog');
    generation = 2;
    await sync();
    assert.equal(count(), 3);
    assert.equal(await js('online.items.length'), 3, 'Manual sync must bypass a cacheable HTTP response');
    assert.equal(await js("document.querySelectorAll('.card.online').length"), 3);
    const successfulTime = await js('online.fetchedAt');
    fail = true;
    await sync();
    assert.equal(count(), 4);
    assert.equal(await js('online.stale'), true);
    assert.equal(await js('online.fetchedAt'), successfulTime, 'A failure must not advance the successful-sync timestamp');
    assert.equal(await js("document.querySelectorAll('.card.online').length"), 3, 'Cached cards should stay visible');
    assert.match(await js("document.getElementById('sourceStatusText').textContent"), /缓存目录/);
    fail = false;
    await js("document.getElementById('sourceLocalBtn').click()");
    await sync();
    assert.equal(count(), 5);
    assert.equal(await js('online.stale'), false);
    assert.equal(await js('sourceMode'), 'online');
    assert.equal(await js("document.getElementById('syncOnlineLabel').textContent"), '同步在线壁纸');
    const out = path.join(root, 'temp/online-sync-check'); fs.mkdirSync(out, { recursive: true });
    for (const width of [1360, 1040]) {
      win.setContentSize(width, 880);
      await js("document.querySelector('.source-bar').scrollIntoView({block:'center'})");
      await wait(200);
      assert.ok(await js("document.documentElement.scrollWidth <= innerWidth"), 'Horizontal overflow');
      assert.ok(await js("(() => { const b=document.getElementById('syncOnlineBtn').getBoundingClientRect(); return b.left>=0 && b.right<=innerWidth && b.width>100; })()"));
      fs.writeFileSync(path.join(out, `sync-${width}.png`), (await win.webContents.capturePage()).toPNG());
    }
    assert.equal(treeHash(), originalHash, 'Sync must not modify local artwork');
    assert.deepEqual(fs.readdirSync(library), ['local-art'], 'Sync must not add wallpaper folders');
    assert.equal(requests.filter(url => url.startsWith('/download.jpg')).length, 0, 'Sync must not download artwork');
    assert.ok(requests.filter(url => url.startsWith('/data/')).every(url => /_sync=\d+/.test(url)));
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ catalogRequests: count(), downloads: 0, localUnchanged: true, duplicateClicks: 'deduplicated', httpCache: 'bypassed', staleFallback: 'passed', rendererErrors: errors }, null, 2));
    console.log('PASS: real main/preload/renderer IPC, first failure/retry, refresh cache bypass, duplicate clicks, stale fallback, timestamps, local preservation, no downloads, 1360/1040 layouts.');
    server.close(); app.exit(0);
  } catch (error) { server.close(); throw error; }
}
if (process.versions.electron) run().catch(error => { console.error(error); require('electron').app.exit(1); });
else {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = require('node:child_process').spawnSync(require('electron'), [__filename], { env, stdio: 'inherit', windowsHide: true, timeout: 90000 });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
