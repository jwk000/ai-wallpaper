'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const PREVIEW_NAMES = ['preview.png', 'preview.jpg', 'preview.jpeg', 'preview.webp'];
const ACCENT_PALETTE = ['#9fc7b5', '#f0c987', '#6fd6e8', '#c7b3f0', '#ff9a6b', '#78e08f'];

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function readTitle(htmlPath) {
  try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : '';
  } catch {
    return '';
  }
}

function splitTitle(raw) {
  const value = String(raw || '').trim();
  if (!value) return { title: '', subtitle: '' };
  for (const separator of [' · ', ' — ', ' – ', ' | ', ' - ']) {
    const index = value.indexOf(separator);
    if (index > 0 && index < value.length - separator.length) {
      return {
        title: value.slice(0, index).trim(),
        subtitle: value.slice(index + separator.length).trim(),
      };
    }
  }
  return { title: value, subtitle: '' };
}

function hashAccent(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

function safeMeta(folderPath) {
  const metaPath = path.join(folderPath, 'meta.json');
  if (!fs.existsSync(metaPath)) return { meta: null, problem: null };
  try {
    const raw = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { meta: null, problem: 'meta.json 不是对象' };
    }
    const meta = {};
    if (typeof raw.title === 'string') meta.title = raw.title.trim();
    if (typeof raw.subtitle === 'string') meta.subtitle = raw.subtitle.trim();
    if (typeof raw.description === 'string') meta.description = raw.description.trim();
    if (Array.isArray(raw.tags)) {
      meta.tags = raw.tags
        .filter((tag) => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 6);
    }
    if (typeof raw.accent === 'string' && /^#[0-9a-f]{6}$/i.test(raw.accent)) meta.accent = raw.accent;
    if (Number.isFinite(raw.order)) meta.order = raw.order;
    if (typeof raw.author === 'string') meta.author = raw.author.trim();
    return { meta, problem: null };
  } catch (error) {
    return { meta: null, problem: 'meta.json 解析失败：' + error.message };
  }
}

function scanWallpapers(rootDir) {
  const wallpapers = [];
  const problems = [];

  let entries;
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch (error) {
    return {
      wallpapers,
      problems: [{ id: '', title: '壁纸目录', reason: '无法读取：' + error.message }],
    };
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const id = entry.name;
    const folderPath = path.join(rootDir, id);
    const htmlPath = path.join(folderPath, 'wallpaper.html');

    if (!fs.existsSync(htmlPath)) {
      problems.push({ id, title: id, reason: '缺少 wallpaper.html' });
      continue;
    }

    let previewPath = null;
    for (const name of PREVIEW_NAMES) {
      const candidate = path.join(folderPath, name);
      if (fs.existsSync(candidate)) {
        previewPath = candidate;
        break;
      }
    }

    const { meta, problem } = safeMeta(folderPath);
    if (problem) problems.push({ id, title: (meta && meta.title) || id, reason: problem });
    if (!previewPath) problems.push({ id, title: (meta && meta.title) || id, reason: '缺少 preview.png' });

    let htmlStat = null;
    let previewStat = null;
    try {
      htmlStat = fs.statSync(htmlPath);
    } catch {}
    if (previewPath) {
      try {
        previewStat = fs.statSync(previewPath);
      } catch {}
    }

    const rawTitle = (meta && meta.title) || readTitle(htmlPath) || id;
    const parts = splitTitle(rawTitle);
    const title = (meta && meta.title) || parts.title || id;
    const subtitle = (meta && meta.subtitle) || parts.subtitle || '';
    const accent = (meta && meta.accent) || hashAccent(id);

    const previewUrl = previewPath
      ? pathToFileURL(previewPath).href + '?v=' + Math.round((previewStat ? previewStat.mtimeMs : Date.now()) / 1000)
      : null;

    wallpapers.push({
      id,
      title,
      subtitle,
      description: (meta && meta.description) || '单文件 HTML 动态壁纸',
      tags: (meta && meta.tags && meta.tags.length ? meta.tags : ['HTML']).slice(0, 6),
      accent,
      order: (meta && Number.isFinite(meta.order) ? meta.order : 1000) + 0,
      author: (meta && meta.author) || '',
      folderPath,
      htmlPath,
      previewPath,
      previewUrl,
      htmlUrl: pathToFileURL(htmlPath).href,
      bytes: (htmlStat ? htmlStat.size : 0) + (previewStat ? previewStat.size : 0),
      updatedAt: htmlStat ? htmlStat.mtimeMs : 0,
    });
  }

  wallpapers.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, 'zh-Hans-CN');
  });

  return { wallpapers, problems };
}

function seedWallpapers(targetDir, bundledDir, skipIds = []) {
  if (!bundledDir || path.resolve(targetDir) === path.resolve(bundledDir)) return;
  const skip = new Set(Array.isArray(skipIds) ? skipIds.filter((id) => typeof id === 'string') : []);
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    if (!fs.existsSync(bundledDir)) return;
    const entries = fs.readdirSync(bundledDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      if (skip.has(entry.name)) continue;
      const destination = path.join(targetDir, entry.name);
      if (!fs.existsSync(destination)) {
        fs.cpSync(path.join(bundledDir, entry.name), destination, { recursive: true });
      }
    }
  } catch (error) {
    console.warn('[流光] 初始化壁纸目录失败：', error.message);
  }
}

module.exports = { scanWallpapers, seedWallpapers, splitTitle };
