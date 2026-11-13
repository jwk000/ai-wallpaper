'use strict';
// Refresh all local artworks from their metadata and existing preview images.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

async function run() {
  const { app, nativeImage } = require('electron');
  await app.whenReady();
  const file = path.join(root, 'site/data/wallpapers.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byId = new Map(manifest.wallpapers.map(item => [item.id, item]));
  const categories = {
    'ant-garden': '自然', 'changping-danshui': '自然', 'chladni-sand': '抽象',
    'dew-spiderweb': '自然', 'ecosystem-aquarium': '自然', 'gravity-garden': '科幻',
    'impossible-town': '抽象', 'listening-garden': '自然', 'microcosm': '自然',
    'pocket-fairground': '自然', 'rainy-night-train': '自然', 'seasonal-city': '自然',
    'shanshui-scroll': '自然', 'thunder-prairie': '自然', 'word-cloud': '抽象',
  };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const ids = fs.readdirSync(path.join(root, 'wallpapers')).filter(id => fs.existsSync(path.join(root, 'wallpapers', id, 'wallpaper.html'))).sort();
  for (const id of ids) {
    const dir = path.join(root, 'wallpapers', id);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const source = ['preview.png', 'preview.jpg', 'preview.webp'].map(name => path.join(dir, name)).find(name => fs.existsSync(name));
    if (!source) throw new Error(`${id}: missing preview`);
    const image = nativeImage.createFromPath(source);
    if (image.isEmpty()) throw new Error(`${id}: invalid preview`);
    const { width, height } = image.getSize();
    const original = image.toJPEG(94);
    const assets = `assets/wallpapers/${id}`;
    const output = path.join(root, 'site', assets);
    fs.mkdirSync(output, { recursive: true });
    const download = `${assets}/${id}-${width}x${height}.jpg`;
    fs.writeFileSync(path.join(root, 'site', download), original);
    fs.writeFileSync(path.join(output, 'preview.jpg'), image.resize({ width: Math.min(width, 960) }).toJPEG(87));
    const existing = byId.get(id);
    const item = existing || { id, category: categories[id] || '抽象', author: 'Lumen Studio', createdAt: today, license: 'CC BY-NC 4.0', rank: manifest.wallpapers.length + 1, featured: false };
    Object.assign(item, { title: meta.title, subtitle: meta.subtitle, description: meta.description, tags: meta.tags,
      preview: `${assets}/preview.jpg`, download, downloadName: `lumen-${id}-${width}x${height}.jpg`,
      width, height, format: 'JPG', bytes: original.length, color: meta.accent || item.color,
      aspect: Number((width / height).toFixed(4)), path: download,
      blur: image.resize({ width: 24 }).toDataURL() });
    if (!existing) { manifest.wallpapers.push(item); byId.set(id, item); }
  }
  manifest.wallpapers.forEach((item, index) => { item.no = String(index + 1).padStart(2, '0'); });
  manifest.updatedAt = today;
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Synced ${ids.length} local wallpapers; catalog contains ${manifest.wallpapers.length}.`);
  app.exit(0);
}
if (process.versions.electron) run().catch(error => { console.error(error); require('electron').app.exit(1); });
else {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = require('node:child_process').spawnSync(require('electron'), [__filename], { env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
