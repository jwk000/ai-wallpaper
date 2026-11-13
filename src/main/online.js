'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_SITE_URL = 'https://jwk000.github.io/ai-wallpaper/';
const CATALOG_PATH = 'data/wallpapers.json';
const CATALOG_CACHE_TTL = 5 * 60 * 1000;
const MAX_CATALOG_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;
const MAX_ITEMS = 300;

function siteUrl() {
  const candidate = process.env.LUMEN_SITE_URL || DEFAULT_SITE_URL;
  const parsed = new URL(candidate);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('在线壁纸地址只支持 http 或 https。');
  }
  parsed.hash = '';
  parsed.search = '';
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/';
  return parsed.href;
}

function catalogUrl(baseUrl = siteUrl()) {
  return new URL(CATALOG_PATH, baseUrl).href;
}

function safeAbsoluteUrl(value, base, allowedOrigin) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (allowedOrigin && url.origin !== allowedOrigin) return null;
  return url.href;
}

function safeHex(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function sanitizeId(value) {
  const cleaned = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 58);
  return cleaned || 'wallpaper';
}

function localIdFor(value) {
  return `online-${sanitizeId(value)}`;
}

function uniqueLocalId(value, seen) {
  const base = localIdFor(value);
  let id = base;
  let suffix = 2;
  while (seen.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  seen.add(id);
  return id;
}

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeCatalog(manifest, baseUrl = siteUrl()) {
  if (!manifest || !Array.isArray(manifest.wallpapers)) {
    throw new Error('在线壁纸清单格式不正确。');
  }

  const origin = new URL(baseUrl).origin;
  const version = cleanString(manifest.updatedAt, 40);
  const seenIds = new Set();
  const seenLocalIds = new Set();
  const items = [];

  for (const raw of manifest.wallpapers.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== 'object') continue;
    const rawId = cleanString(raw.id, 80);
    const title = cleanString(raw.title, 64);
    if (!rawId || !title) continue;
    if (seenIds.has(rawId)) continue;

    const preview = safeAbsoluteUrl(raw.preview || raw.download, baseUrl, origin);
    const download = safeAbsoluteUrl(raw.download || raw.preview, baseUrl, origin);
    if (!preview || !download) continue;

    seenIds.add(rawId);
    const tags = Array.isArray(raw.tags)
      ? raw.tags.map((tag) => cleanString(tag, 24)).filter(Boolean).slice(0, 6)
      : [];
    const width = Number.isFinite(raw.width) ? Math.max(0, Math.round(raw.width)) : 0;
    const height = Number.isFinite(raw.height) ? Math.max(0, Math.round(raw.height)) : 0;
    const bytes = Number.isFinite(raw.bytes) ? Math.max(0, Math.round(raw.bytes)) : 0;
    const localId = uniqueLocalId(rawId, seenLocalIds);
    const pageUrl = `${baseUrl}#/wallpaper/${encodeURIComponent(rawId)}`;

    items.push({
      id: rawId,
      localId,
      title,
      subtitle: cleanString(raw.subtitle, 80),
      description: cleanString(raw.description, 320),
      author: cleanString(raw.author, 64),
      category: cleanString(raw.category, 32),
      tags,
      license: cleanString(raw.license, 64),
      width,
      height,
      format: cleanString(raw.format, 12).toUpperCase(),
      bytes,
      accent: safeHex(raw.color || raw.accent, '#9fc7b5'),
      createdAt: cleanString(raw.createdAt, 24),
      previewUrl: addVersion(preview, version),
      downloadUrl: download,
      pageUrl,
      no: cleanString(raw.no, 12),
    });
  }

  return {
    items,
    updatedAt: version,
    fetchedAt: Date.now(),
    siteUrl: baseUrl,
    catalogUrl: catalogUrl(baseUrl),
  };
}

function addVersion(url, version) {
  if (!version) return url;
  const parsed = new URL(url);
  parsed.searchParams.set('v', version);
  return parsed.href;
}

async function fetchBuffer(fetchImpl, url, { limit, timeout = 25000, label = '文件', cache = 'default' }) {
  if (typeof fetchImpl !== 'function') throw new Error('当前网络组件不可用。');

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      cache,
      signal: AbortSignal.timeout(timeout),
      headers: { Accept: label === '壁纸清单' ? 'application/json' : 'image/*' },
    });
  } catch (error) {
    const message = error && error.name === 'TimeoutError' ? '请求超时' : error.message || String(error);
    throw new Error(`${label}下载失败：${message}`);
  }

  if (!response.ok) {
    throw new Error(`${label}下载失败（HTTP ${response.status}）。`);
  }

  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new Error(`${label}超过大小限制。`);
  }

  let buffer;
  try {
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw new Error(`${label}读取失败：${error.message || String(error)}`);
  }
  if (buffer.length > limit) throw new Error(`${label}超过大小限制。`);
  return buffer;
}

async function fetchOnlineCatalog(fetchImpl, baseUrl = siteUrl(), { force = false } = {}) {
  const requestUrl = new URL(catalogUrl(baseUrl));
  if (force) requestUrl.searchParams.set('_sync', String(Date.now()));
  const url = requestUrl.href;
  const buffer = await fetchBuffer(fetchImpl, url, {
    limit: MAX_CATALOG_BYTES,
    timeout: 20000,
    label: '壁纸清单',
    cache: 'no-store',
  });

  let manifest;
  try {
    manifest = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new Error('在线壁纸清单不是有效的 JSON。');
  }
  return normalizeCatalog(manifest, baseUrl);
}

function detectImageExtension(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

function escapeHtml(value) {  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wallpaperHtml(title, imageName) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #050607; }
  body { display: grid; place-items: center; }
  img { display: block; width: 100%; height: 100%; object-fit: cover; animation: fade .7s ease both; user-select: none; }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
</style>
</head>
<body>
<img src="${imageName}" alt="">
</body>
</html>
`;
}

async function installOnlineWallpaper(item, { rootDir, fetchImpl }) {
  if (!item || !item.localId || !item.downloadUrl) {
    throw new Error('在线壁纸信息不完整。');
  }
  if (typeof rootDir !== 'string' || !rootDir) throw new Error('壁纸目录不可用。');

  fs.mkdirSync(rootDir, { recursive: true });
  const root = path.resolve(rootDir);
  const folder = path.resolve(root, item.localId);
  if (path.dirname(folder) !== root) throw new Error('在线壁纸目录不合法。');
  if (fs.existsSync(path.join(folder, 'wallpaper.html'))) {
    return { localId: item.localId, already: true };
  }
  if (fs.existsSync(folder)) {
    throw new Error(`壁纸目录里已有同名文件夹「${item.localId}」，请先移除它。`);
  }

  const imageBuffer = await fetchBuffer(fetchImpl, item.downloadUrl, {
    limit: MAX_IMAGE_BYTES,
    timeout: 60000,
    label: '壁纸原图',
  });
  const imageExt = detectImageExtension(imageBuffer);
  if (!imageExt) {
    throw new Error('下载的内容不是受支持的图片格式。');
  }

  let previewBuffer = null;
  let previewExt = null;
  try {
    previewBuffer = await fetchBuffer(fetchImpl, item.previewUrl, {
      limit: MAX_PREVIEW_BYTES,
      timeout: 30000,
      label: '壁纸预览',
    });
    previewExt = detectImageExtension(previewBuffer);
    if (!previewExt) previewBuffer = null;
  } catch {
    previewBuffer = null;
    previewExt = null;
  }

  const temp = path.join(root, `.${item.localId}.download-${process.pid}-${Date.now()}`);
  fs.mkdirSync(temp, { recursive: false });
  try {
    const imageName = `wallpaper.${imageExt}`;
    fs.writeFileSync(path.join(temp, imageName), imageBuffer);

    if (previewBuffer && previewExt) {
      fs.writeFileSync(path.join(temp, `preview.${previewExt}`), previewBuffer);
    } else {
      fs.copyFileSync(path.join(temp, imageName), path.join(temp, `preview.${imageExt}`));
    }

    const meta = {
      title: item.title,
      subtitle: item.subtitle,
      description: item.description || '来自流光壁纸馆的在线作品。',
      tags: item.tags.length ? item.tags : ['在线壁纸'],
      accent: item.accent,
      order: 900,
      author: item.author,
      source: 'Lumen Archive',
      sourceUrl: item.pageUrl,
      onlineId: item.id,
      license: item.license,
      createdAt: item.createdAt,
    };
    fs.writeFileSync(path.join(temp, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(temp, 'wallpaper.html'), wallpaperHtml(item.title, imageName), 'utf8');

    if (fs.existsSync(folder)) {
      fs.rmSync(temp, { recursive: true, force: true });
      return { localId: item.localId, already: true };
    }
    fs.renameSync(temp, folder);
  } catch (error) {
    try {
      fs.rmSync(temp, { recursive: true, force: true });
    } catch {}
    throw new Error('保存壁纸失败：' + (error.message || String(error)));
  }

  return { localId: item.localId, already: false };
}

module.exports = {
  DEFAULT_SITE_URL,
  CATALOG_CACHE_TTL,
  siteUrl,
  catalogUrl,
  normalizeCatalog,
  fetchOnlineCatalog,
  installOnlineWallpaper,
  localIdFor,
};
