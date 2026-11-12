'use strict';
// Real Chromium/Electron verification, offline captures and curated-site assets.
// node scripts/verify-dream-atlas.cjs [--capture] [--only=wallpaper-id]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const ids = ['gravity-specimen', 'waking-reflection', 'forgetting-garden', 'eclipse-rehearsal'];
const out = path.join(os.tmpdir(), 'lumen-dream-atlas-check');
const capture = process.argv.includes('--capture');
const only = process.argv.find(x => x.startsWith('--only='))?.slice(7);
const selected = only ? ids.filter(id => id === only) : ids;
assert.ok(selected.length, 'Unknown artwork ID');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

async function run() {
  const { app, BrowserWindow, nativeImage } = require('electron');
  // Keep verification isolated from the user profile.
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-atlas-profile-'));
  app.setPath('userData', profile);
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  await app.whenReady();
  fs.mkdirSync(out, { recursive: true });
  const win = new BrowserWindow({ width: 1920, height: 1080, useContentSize: true, show: false, webPreferences: { offscreen: true, backgroundThrottling: false, contextIsolation: true, nodeIntegration: false } });
  win.webContents.setFrameRate(30);
  const errors = [], requests = [], results = [];
  win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  win.webContents.on('render-process-gone', (_, detail) => errors.push(JSON.stringify(detail)));
  win.webContents.session.webRequest.onBeforeRequest((details, callback) => { if (/^https?:/.test(details.url)) { requests.push(details.url); callback({ cancel: true }); } else callback({}); });
  const js = code => win.webContents.executeJavaScript(code);
  const state = () => js('__dreamAtlas.snapshot()');
  const pixels = () => js("document.getElementById('scene').toDataURL('image/png')");
  const saveCanvas = async file => {
    const url = await pixels(); const img = nativeImage.createFromDataURL(url); fs.writeFileSync(file, img.toPNG()); return img;
  };
  try {
    for (const id of selected) {
      const html = path.join(root, 'wallpapers', id, 'wallpaper.html');
      const source = fs.readFileSync(html, 'utf8');
      new (require('node:vm').Script)(source.match(/<script>([\s\S]*?)<\/script>/)[1], { filename: id });
      assert.ok(!/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(source), id + ': external asset');
      win.setContentSize(1920, 1080);
      await win.loadFile(html, { query: { seed: '20261111', still: '1', hud: '0', t: '24' } });
      await wait(80);
      assert.equal((await state()).id, id);
      assert.equal((await state()).paused, true);
      const first = hash(await pixels());
      await wait(80); assert.equal(hash(await pixels()), first, id + ': still frame changed');
      // Catch NaN/Infinity at the actual Canvas API boundary, including very late times.
      await js(`(() => {
        window.__badCoordinates = [];
        for (const name of ['moveTo','lineTo','bezierCurveTo','quadraticCurveTo','arc','ellipse','fillRect','rect','translate','rotate','scale']) {
          const original = CanvasRenderingContext2D.prototype[name];
          CanvasRenderingContext2D.prototype[name] = function(...args) {
            if (args.some(a => typeof a === 'number' && !Number.isFinite(a))) __badCoordinates.push(name);
            return original.apply(this, args);
          };
        }
      })()`);
      for (const time of [0, 30, 95, 180, 240, 3600, 86400, 10000000]) await js(`__dreamAtlas.seek(${time})`);
      assert.deepEqual(await js('__badCoordinates'), [], id + ': invalid geometry');
      await js('__dreamAtlas.seek(39)');
      assert.notEqual(hash(await pixels()), first, id + ': no motion across time');
      await js('__dreamAtlas.seek(24)');
      // Save an untriggered representative composition.
      const image = await saveCanvas(path.join(out, id + '.png'));
      const bitmap = image.toBitmap();
      let min = 255, max = 0;
      for (let i = 0; i < bitmap.length; i += 388) { min = Math.min(min, bitmap[i]); max = Math.max(max, bitmap[i]); }
      assert.ok(max - min > 25, id + ': nearly blank image');
      if (capture) {
        fs.writeFileSync(path.join(root, 'wallpapers', id, 'preview.png'), image.toPNG());
        const dir = path.join(root, 'site/assets/wallpapers', id); fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'preview.jpg'), image.resize({ width: 640 }).toJPEG(87));
        fs.writeFileSync(path.join(dir, id + '-1920x1080.jpg'), image.toJPEG(94));
      }
      const noEvent = hash(await pixels());
      await js("document.getElementById('event').click()");
      assert.notEqual(hash(await pixels()), noEvent, id + ': special event did not change image');
      await saveCanvas(path.join(out, id + '-event.png'));
      // Responsive composition, including paused redraw and a strict backing-store cap.
      for (const [width, height] of [[390, 844], [3440, 1440], [3840, 2160]]) {
        const before = (await state()).frames; win.setContentSize(width, height); await wait(100);
        const current = await state(); assert.equal(current.w, width); assert.equal(current.h, height); assert.ok(current.frames > before);
        assert.ok(await js('scene.width * scene.height <= 2600000'), id + ': pixel budget');
        await saveCanvas(path.join(out, `${id}-${width}.png`));
      }
      win.setContentSize(1280, 720); await wait(80);
      const oldSeed = (await state()).seed;
      await js("document.getElementById('reseed').click()"); assert.notEqual((await state()).seed, oldSeed);
      await js("document.getElementById('quality').value='low'; document.getElementById('quality').dispatchEvent(new Event('change'))");
      assert.equal((await state()).quality, 'low');
      assert.ok(await js('scene.width * scene.height <= 1200000'));
      await js("document.getElementById('speed').value='2'; document.getElementById('speed').dispatchEvent(new Event('change'))"); assert.equal((await state()).speed, 2);
      await js("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}))");
      assert.equal(await js("document.getElementById('panel').hidden"), false);
      assert.equal(await js("document.getElementById('settings').getAttribute('aria-expanded')"), 'true');
      await js("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true}))");
      const running = await state(); assert.equal(running.paused, false); await wait(400);
      assert.ok((await state()).t > running.t, id + ': live animation did not advance');
      // Synthetic visibility event uses the same browser lifecycle handler, then restores the real property.
      await js("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");
      const hidden = await state(); assert.equal(hidden.scheduled, false); await wait(80); assert.equal((await state()).t, hidden.t);
      await js("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))"); await wait(100); assert.ok((await state()).t > hidden.t);
      await js("document.getElementById('pause').click()"); assert.equal((await state()).paused, true);
      const paused = hash(await pixels()); await wait(80); assert.equal(hash(await pixels()), paused);
      // Real browser media emulation tests both default and live preference changes.
      win.webContents.debugger.attach('1.3');
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await win.loadFile(html, { query: { hud: '0' } }); assert.equal((await state()).paused, true);
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
      await wait(100); assert.equal((await state()).paused, false);
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await wait(100); assert.equal((await state()).paused, true);
      await win.loadFile(html, { query: { still: '0', hud: '0' } }); assert.equal((await state()).paused, false);
      win.webContents.debugger.detach();
      await js("document.getElementById('pause').click()");
      // Measure uninstrumented Canvas rendering at 1080p; profiling excludes PNG encoding.
      win.setContentSize(1920, 1080); await wait(100);
      const timings = await js(`(() => { const a=[]; for(let i=0;i<12;i++){ const start=performance.now(); __dreamAtlas.seek(24+i*.1);a.push(performance.now()-start); } return a.sort((a,b)=>a-b); })()`);
      const ms = timings[6];
      results.push({ id, medianRenderMs1080p: +ms.toFixed(2), viewports: 4, longTimeSeconds: 10000000 });
      console.log(`PASS ${id}: offline, animation, event, 4 viewports, controls, visibility, reduced motion; 1080p draw ${ms.toFixed(1)} ms`);
    }
    assert.deepEqual(errors, [], 'Renderer errors'); assert.deepEqual(requests, [], 'External requests');
    if (capture) {
      const file = path.join(root, 'site/data/wallpapers.json'), manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const id of selected) {
        const meta = JSON.parse(fs.readFileSync(path.join(root, 'wallpapers', id, 'meta.json'), 'utf8'));
        const index = ids.indexOf(id), prefix = 'assets/wallpapers/' + id + '/', download = prefix + id + '-1920x1080.jpg';
        const old = manifest.wallpapers.find(x => x.id === id);
        const blur = nativeImage.createFromPath(path.join(root, 'wallpapers', id, 'preview.png')).resize({ width: 24 }).toDataURL();
        const item = { id, title: meta.title, subtitle: meta.subtitle, category: meta.tags[2], author: 'Lumen Studio', createdAt: '2026-11-11', tags: meta.tags.slice(1), description: meta.description, license: 'CC BY-NC 4.0', rank: 30 + index, featured: false, preview: prefix + 'preview.jpg', download, downloadName: 'lumen-' + id + '-1920x1080.jpg', width: 1920, height: 1080, format: 'JPG', bytes: fs.statSync(path.join(root, 'site', download)).size, blur, color: meta.accent, aspect: 1.7778, path: download, no: String(30 + index).padStart(2, '0') };
        if (old) Object.assign(old, item); else manifest.wallpapers.push(item);
      }
      manifest.updatedAt = '2026-11-11'; fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
    }
    if (!only) {
      const slides = ids.map(id => ({ title: JSON.parse(fs.readFileSync(path.join(root, 'wallpapers', id, 'meta.json'), 'utf8')).title, url: nativeImage.createFromPath(path.join(out, id + '.png')).toDataURL() }));
      const sheet = await js(`(async () => {
        const c=document.createElement('canvas'); c.width=1280;c.height=Math.ceil(${ids.length}/2)*392;
        const g=c.getContext('2d');g.fillStyle='#11171f';g.fillRect(0,0,c.width,c.height);
        const slides=${JSON.stringify(slides)};
        for(let i=0;i<slides.length;i++) { const img=new Image();img.src=slides[i].url;await img.decode();
          const x=(i%2)*640,y=Math.floor(i/2)*392;g.drawImage(img,x,y,640,360);
          g.fillStyle='#d9d9d1';g.font='15px "Microsoft YaHei",sans-serif';g.fillText(String(i+1).padStart(2,'0')+' / '+slides[i].title,x+16,y+382);
        }return c.toDataURL('image/jpeg',.92);
      })()`);
      const jpg = nativeImage.createFromDataURL(sheet).toJPEG(92);
      fs.writeFileSync(path.join(out, 'contact.jpg'), jpg);
      if (capture) fs.writeFileSync(path.join(root, 'docs/screenshots/dream-atlas.jpg'), jpg);
    }
    const library = require('../src/main/library').scanWallpapers(path.join(root, 'wallpapers'));
    for (const id of selected) { assert.ok(library.wallpapers.some(x => x.id === id)); assert.deepEqual(library.problems.filter(x => x.id === id), []); }
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ results, errors, requests }, null, 2));
    console.log('ALL CHECKS PASS. Captures: ' + out);
    win.destroy(); app.exit(0);
  } catch (error) {
    console.error(error); console.error({ errors, requests }); win.destroy(); app.exit(1);
  }
}
if (process.versions.electron) run().catch(e => { console.error(e); require('electron').app.exit(1); });
else {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const child = require('node:child_process').spawnSync(require('electron'), [__filename, ...process.argv.slice(2)], { env, stdio: 'inherit', windowsHide: true, timeout: 300000 });
  if (child.error) throw child.error; process.exitCode = child.status ?? 1;
}
