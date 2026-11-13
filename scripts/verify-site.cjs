'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'temp/site-check');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

async function run() {
  const { app, BrowserWindow, nativeImage } = require('electron');
  app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-site-check-')));
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  await app.whenReady();
  fs.mkdirSync(output, { recursive: true });
  const site = path.join(root, '_site');
  const manifest = JSON.parse(fs.readFileSync(path.join(site, 'data/wallpapers.json'), 'utf8'));
  const ids = fs.readdirSync(path.join(root, 'wallpapers')).filter(id => fs.existsSync(path.join(root, 'wallpapers', id, 'wallpaper.html')));
  assert.deepEqual(manifest.wallpapers.map(item => item.id).sort(), [...ids].sort(), 'All local wallpapers must be published');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
  const missing = [];
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(site, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(site + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { missing.push(pathname); res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const win = new BrowserWindow({ width: 1280, height: 720, useContentSize: true, show: false, webPreferences: { offscreen: true, backgroundThrottling: false, contextIsolation: true, nodeIntegration: false } });
  const errors = [], requests = [], results = [], slides = [];
  let context = '';
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push({ context, message: event.message }); });
  win.webContents.on('render-process-gone', (_, detail) => errors.push({ context, message: detail.reason }));
  win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    const external = /^https?:/.test(details.url) && !details.url.startsWith(base);
    if (external) requests.push({ context, url: details.url });
    callback({ cancel: external });
  });
  const js = code => win.webContents.executeJavaScript(code);
  try {
    for (const item of manifest.wallpapers) {
      if (process.argv.includes('--sandbox-only')) {
        slides.push({ id: item.id, title: item.title, image: nativeImage.createFromPath(path.join(output, `${item.id}.jpg`)).resize({ width: 320 }).toDataURL() });
        results.push({ id: item.id });
        continue;
      }
      context = `${item.id}: standalone offline`;
      for (const field of ['preview', 'download', 'live']) assert.ok(fs.existsSync(path.join(site, item[field])), `${item.id}: missing ${field}`);
      const image = nativeImage.createFromPath(path.join(site, item.download));
      assert.deepEqual(image.getSize(), { width: item.width, height: item.height });
      assert.equal(fs.statSync(path.join(site, item.download)).size, item.bytes);
      assert.ok(!nativeImage.createFromPath(path.join(site, item.preview)).isEmpty());
      const html = fs.readFileSync(path.join(root, 'wallpapers', item.id, 'wallpaper.html'), 'utf8');
      assert.ok(!/<script\b[^>]*\bsrc\s*=/i.test(html), `${item.id}: external script in original`);
      const live = fs.readFileSync(path.join(site, item.live), 'utf8');
      assert.ok(!/<script\b[^>]*\bsrc\s*=/i.test(live), `${item.id}: external script in download`);
      // Copy just the HTML to an empty directory: neighboring resources cannot hide dependencies.
      const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-single-html-'));
      const target = path.join(isolated, 'wallpaper.html');
      fs.writeFileSync(target, live);
      await win.loadFile(target);
      await wait(700);
      const first = await win.webContents.capturePage();
      await wait(400);
      const second = await win.webContents.capturePage();
      const pixels = second.resize({ width: 160 }).toBitmap();
      const levels = new Set();
      for (let i = 0; i < pixels.length; i += 4) levels.add(`${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`);
      assert.ok(levels.size > 8, `${item.id}: blank rendering`);
      const moving = hash(first.toPNG()) !== hash(second.toPNG());
      assert.ok(moving, `${item.id}: no animation`);
      fs.writeFileSync(path.join(output, `${item.id}.jpg`), second.toJPEG(85));
      slides.push({ id: item.id, title: item.title, image: second.resize({ width: 320 }).toDataURL() });
      results.push({ id: item.id, offline: true, moving, colors: levels.size });
      console.log('PASS standalone', item.id);
    }
    context = 'gallery';
    await win.loadURL(base);
    await wait(500);
    assert.equal(await js("document.querySelectorAll('#gallery > [data-wallpaper-id]').length"), ids.length);
    fs.writeFileSync(path.join(output, 'gallery-desktop.jpg'), (await win.webContents.capturePage()).toJPEG(90));
    for (const item of manifest.wallpapers) {
      context = `${item.id}: sandbox preview`;
      await js(`location.hash = ${JSON.stringify('#/wallpaper/' + item.id)}`);
      await wait(100);
      assert.equal(await js("document.querySelector('#detail-title').textContent"), item.title);
      await js("document.querySelector('#detail-play').click()");
      await wait(500);
      assert.equal(await js("document.querySelectorAll('#detail-live iframe').length"), 1);
      const frame = win.webContents.mainFrame.frames.find(frame => frame.url.includes('/live.html'));
      assert.ok(frame, `${item.id}: preview iframe missing`);
      assert.ok(await frame.executeJavaScript("[...document.querySelectorAll('canvas')].some(c => c.width > 0 && c.height > 0)"), `${item.id}: preview canvas missing`);
      results.find(result => result.id === item.id).sandboxPreview = true;
      console.log('PASS sandbox', item.id);
    }
    await js("document.querySelector('#detail-dialog').close()");
    await wait(500);
    context = 'mobile gallery';
    win.setContentSize(390, 844);
    await wait(200);
    assert.ok(await js('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow');
    fs.writeFileSync(path.join(output, 'gallery-mobile.jpg'), (await win.webContents.capturePage()).toJPEG(90));
    context = 'contact sheet';
    const contact = await js(`(async () => {
      const slides=${JSON.stringify(slides)}, c=document.createElement('canvas');c.width=1280;c.height=Math.ceil(slides.length/4)*210;
      const g=c.getContext('2d');g.fillStyle='#161b22';g.fillRect(0,0,c.width,c.height);
      for(let i=0;i<slides.length;i++){const s=slides[i],img=new Image();img.src=s.image;await img.decode();const x=i%4*320,y=Math.floor(i/4)*210;g.drawImage(img,x,y,320,180);g.fillStyle='#eeeeee';g.font='14px "Microsoft YaHei"';g.fillText(s.title,x+8,y+201);}
      return c.toDataURL('image/jpeg',.88);
    })()`);
    fs.writeFileSync(path.join(output, 'contact.jpg'), nativeImage.createFromDataURL(contact).toJPEG(90));
    assert.deepEqual(missing, [], 'Missing HTTP resources');
    assert.deepEqual(requests, [], 'External network dependencies');
    assert.deepEqual(errors, [], 'Renderer errors');
    console.log(`PASS ${results.length} ${process.argv.includes('--sandbox-only') ? 'sandbox' : 'standalone + sandbox'} previews; desktop/mobile gallery.`);
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ results, errors, requests, missing }, null, 2));
    win.destroy(); server.close();
  }
  app.exit(0);
}
if (process.versions.electron) run().catch(error => { console.error(error); require('electron').app.exit(1); });
else {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = require('node:child_process').spawnSync(require('electron'), [__filename, ...process.argv.slice(2)], { env, stdio: 'inherit', windowsHide: true, timeout: 300000 });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
