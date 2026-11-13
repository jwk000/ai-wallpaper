'use strict';

/**
 * 组装可发布的静态站点。
 *
 * 仓库里每套壁纸的 HTML 只保留一份：wallpapers/<id>/wallpaper.html。
 * 发布时把 site/ 复制到 _site/，再把其中带 HTML 的壁纸复制为
 * _site/assets/wallpapers/<id>/live.html，并在清单里补上 live 字段。
 * site/ 目录里不会出现第二份壁纸源码。
 *
 * 用法：
 *   node scripts/build-site.js                 # 输出到 _site/
 *   node scripts/build-site.js --out _build     # 自定义输出目录
 *   node scripts/build-site.js --serve          # 构建后本地预览（默认 4173 端口）
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const WALLPAPERS_DIR = path.join(ROOT, 'wallpapers');
const MANIFEST_FILE = path.join(SITE_DIR, 'data', 'wallpapers.json');

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

const OUT_DIR = path.resolve(ROOT, argValue('--out', '_site'));
const PORT = Number(argValue('--port', '4173'));
const SHOULD_SERVE = process.argv.includes('--serve');

function fail(message) {
  console.error(`[site] ${message}`);
  process.exit(1);
}

function assertSafeOutputDir(outDir) {
  const relative = path.relative(ROOT, outDir);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail(`输出目录必须位于仓库内：${outDir}`);
  }
  if (outDir === SITE_DIR || outDir.startsWith(SITE_DIR + path.sep)) {
    fail('输出目录不能是 site/ 或位于 site/ 内，否则会递归复制。');
  }
  if (outDir === WALLPAPERS_DIR || outDir.startsWith(WALLPAPERS_DIR + path.sep)) {
    fail('输出目录不能位于 wallpapers/ 内。');
  }
}

function findSiteWallpaperHtml(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findSiteWallpaperHtml(full));
    else if (/^(wallpaper|live)\.html$/i.test(entry.name)) found.push(full);
  }
  return found;
}

// Keep the downloaded HTML self-contained, including locally vendored libraries.
function bundleLocalScripts(html, sourceDir) {
  return html.replace(/<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (tag, before, src, after) => {
      if (/^(?:[a-z]+:|\/\/)/i.test(src)) return tag;
      const file = path.resolve(sourceDir, src);
      if (!file.startsWith(sourceDir + path.sep) || !fs.existsSync(file)) {
        fail(`找不到安全的本地脚本：${src} (${sourceDir})`);
      }
      if (/\btype\s*=\s*["']module["']/i.test(before + after)) {
        fail(`模块脚本需要专用打包：${src}`);
      }
      const code = fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
      return `<script${before}${after}>\n${code}\n</script>`;
    });
}

function build() {
  if (!fs.existsSync(MANIFEST_FILE)) fail(`找不到清单：${MANIFEST_FILE}`);
  assertSafeOutputDir(OUT_DIR);

  const duplicates = findSiteWallpaperHtml(SITE_DIR);
  if (duplicates.length) {
    fail(
      'site/ 下出现了壁纸 HTML，仓库里只能保留 wallpapers/<id>/ 一份：\n' +
        duplicates.map((file) => `  ${path.relative(ROOT, file)}`).join('\n')
    );
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.cpSync(SITE_DIR, OUT_DIR, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  if (!manifest || !Array.isArray(manifest.wallpapers)) {
    fail('site/data/wallpapers.json 缺少 wallpapers 数组。');
  }

  const ids = new Set(manifest.wallpapers.map(item => item.id));
  if (ids.size !== manifest.wallpapers.length) fail('站点清单存在重复 id。');
  const missing = fs.readdirSync(WALLPAPERS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(WALLPAPERS_DIR, entry.name, 'wallpaper.html')) && !ids.has(entry.name))
    .map(entry => entry.name);
  if (missing.length) fail(`壁纸尚未发布到清单：${missing.join(', ')}。请运行 npm run sync:site。`);

  const live = [];
  const staticOnly = [];

  for (const item of manifest.wallpapers) {
    if (!item || !item.id) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(item.id)) {
      console.warn(`[site] 跳过非法作品 id：${JSON.stringify(item.id)}`);
      delete item.live;
      continue;
    }

    const source = path.join(WALLPAPERS_DIR, item.id, 'wallpaper.html');
    if (!fs.existsSync(source)) {
      delete item.live;
      staticOnly.push(item.id);
      continue;
    }

    const html = fs.readFileSync(source, 'utf8');
    if (!html.trim()) fail(`${source} 是空文件。`);
    if (/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html)) {
      console.warn(`[site] 警告：${item.id} 的壁纸引用了外部资源，离线预览可能不完整。`);
    }

    const targetDir = path.join(OUT_DIR, 'assets', 'wallpapers', item.id);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'live.html'), bundleLocalScripts(html, path.dirname(source)));
    // Distribute vendored library attribution alongside the playable artifact.
    for (const license of ['THREE-LICENSE.txt', 'vendor/LICENSE']) {
      const file = path.join(path.dirname(source), license);
      if (fs.existsSync(file)) fs.copyFileSync(file, path.join(targetDir, path.basename(license)));
    }

    item.live = `assets/wallpapers/${item.id}/live.html`;
    live.push(item.id);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'data', 'wallpapers.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  console.log(`[site] 输出目录：${path.relative(ROOT, OUT_DIR) || OUT_DIR}`);
  console.log(`[site] 可播放动效 ${live.length} 幅：${live.join(', ') || '无'}`);
  console.log(`[site] 仅静图 ${staticOnly.length} 幅：${staticOnly.join(', ') || '无'}`);
  if (staticOnly.length) {
    console.log('[site] 提示：把 wallpaper.html 放进 wallpapers/<id>/ 后重新构建即可补上动效。');
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function serve() {
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }

    let filePath = path.resolve(OUT_DIR, `.${pathname}`);
    if (filePath !== OUT_DIR && !filePath.startsWith(OUT_DIR + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    let status = 200;
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      status = 404;
      filePath = path.join(OUT_DIR, '404.html');
    }

    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(status, {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      fail(`端口 ${PORT} 已被占用，换一个：node scripts/build-site.js --serve --port 4174`);
    }
    fail(error.message);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[site] 本地预览：http://127.0.0.1:${PORT}/`);
  });

  const close = () => server.close(() => process.exit(0));
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}

build();
if (SHOULD_SERVE) serve();
