#!/usr/bin/env node
'use strict';

/**
 * 把 wallpapers/<id>/wallpaper.html 打包成 macOS 屏幕保护程序（.saver）。
 *
 *   node screensaver/build.js            # 只构建到 screensaver/build/
 *   node screensaver/build.js --install  # 构建并安装到 ~/Library/Screen Savers
 *   node screensaver/build.js --test     # 构建后运行渲染自检（截图 + JS 探针）
 *
 * 每个壁纸生成一个独立 .saver，屏幕保护程序设置里会分别出现，
 * 这样不需要在沙盒里读取外部文件，也不需要配置文件。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = __dirname;
const WALLPAPERS_DIR = path.join(ROOT, 'wallpapers');
const BUILD_DIR = path.join(SOURCE_DIR, 'build');
const TMP_DIR = path.join(SOURCE_DIR, '.build');
const BINARY = path.join(TMP_DIR, 'LumenSaver');
const MIN_MACOS = '13.0';
const VERSION = '0.1.0';

const args = new Set(process.argv.slice(2));
const shouldInstall = args.has('--install');
const shouldTest = args.has('--test');

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    stdio: options.stdio || 'inherit',
    ...options,
  });
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function compileHost() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  console.log('▸ 编译屏保宿主（arm64 + x86_64）…');
  run('clang', [
    '-fobjc-arc',
    '-bundle',
    `-mmacosx-version-min=${MIN_MACOS}`,
    '-arch', 'arm64',
    '-arch', 'x86_64',
    '-o', BINARY,
    path.join(SOURCE_DIR, 'LumenSaverView.m'),
    '-framework', 'Cocoa',
    '-framework', 'ScreenSaver',
    '-framework', 'WebKit',
    '-Wl,-undefined,dynamic_lookup',
  ]);
}

function discoverWallpapers() {
  const entries = fs
    .readdirSync(WALLPAPERS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => fs.existsSync(path.join(WALLPAPERS_DIR, id, 'wallpaper.html')));

  const wallpapers = entries.map((id) => {
    const dir = path.join(WALLPAPERS_DIR, id);
    let meta = {};
    const metaPath = path.join(dir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      try {
        meta = readJSON(metaPath);
      } catch (error) {
        console.warn(`  ! ${id}/meta.json 解析失败，忽略：${error.message}`);
      }
    }
    const title = meta.title || id;
    return {
      id,
      dir,
      title,
      subtitle: meta.subtitle || '',
      order: Number.isFinite(meta.order) ? meta.order : 999,
      bundleName: `流光 · ${title}.saver`,
      bundleID: `com.lumen.wallpaper.saver.${id.replace(/[^a-zA-Z0-9.-]/g, '-')}`,
    };
  });

  wallpapers.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-Hans-CN'));
  return wallpapers;
}

function infoPlist(wallpaper) {
  const displayName = `流光 · ${wallpaper.title}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>zh_CN</string>
    <key>CFBundleDisplayName</key>
    <string>${xmlEscape(displayName)}</string>
    <key>CFBundleExecutable</key>
    <string>LumenSaver</string>
    <key>CFBundleIdentifier</key>
    <string>${xmlEscape(wallpaper.bundleID)}</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>${xmlEscape(displayName)}</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>LSMinimumSystemVersion</key>
    <string>${MIN_MACOS}</string>
    <key>NSPrincipalClass</key>
    <string>LumenSaverView</string>
    <key>NSHumanReadableCopyright</key>
    <string>流光壁纸 · Lumen Wallpaper</string>
    <key>LumenWallpaperIdentifier</key>
    <string>${xmlEscape(wallpaper.id)}</string>
</dict>
</plist>
`;
}

function buildBundle(wallpaper) {
  const bundlePath = path.join(BUILD_DIR, wallpaper.bundleName);
  fs.rmSync(bundlePath, { recursive: true, force: true });

  const contents = path.join(bundlePath, 'Contents');
  const macos = path.join(contents, 'MacOS');
  const resources = path.join(contents, 'Resources');
  fs.mkdirSync(macos, { recursive: true });
  fs.mkdirSync(resources, { recursive: true });

  fs.writeFileSync(path.join(contents, 'Info.plist'), infoPlist(wallpaper));
  fs.copyFileSync(BINARY, path.join(macos, 'LumenSaver'));
  fs.chmodSync(path.join(macos, 'LumenSaver'), 0o755);
  fs.copyFileSync(
    path.join(wallpaper.dir, 'wallpaper.html'),
    path.join(resources, 'wallpaper.html')
  );

  // Ad-hoc 签名：本机 legacyScreenSaver 带 disable-library-validation，
  // 不签名也能加载，但签过之后行为更接近正常分发的 saver。
  try {
    execFileSync('codesign', ['--force', '--sign', '-', '--timestamp=none', bundlePath], {
      stdio: 'pipe',
    });
  } catch (error) {
    const detail = error.stderr ? error.stderr.toString().trim() : error.message;
    throw new Error(`签名失败：${path.basename(bundlePath)}\n${detail}`);
  }

  return bundlePath;
}

function installBundles(bundles) {
  const destination = path.join(os.homedir(), 'Library', 'Screen Savers');
  fs.mkdirSync(destination, { recursive: true });

  const expected = new Map(bundles.map((item) => [item.name, item.path]));

  // 清理旧版本留下的 Lumen saver（按 Info.plist 标记识别，不碰别人的屏保）。
  for (const entry of fs.readdirSync(destination, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('.saver')) continue;
    const candidate = path.join(destination, entry.name);
    if (!path.resolve(candidate).startsWith(path.resolve(destination) + path.sep)) continue;
    if (expected.has(entry.name)) continue;
    const plist = path.join(candidate, 'Contents', 'Info.plist');
    if (!fs.existsSync(plist)) continue;
    try {
      const json = execFileSync('plutil', ['-convert', 'json', '-o', '-', plist], {
        encoding: 'utf8',
      });
      if (JSON.parse(json).LumenWallpaperIdentifier) {
        fs.rmSync(candidate, { recursive: true, force: true });
        console.log(`  - 移除旧屏保 ${entry.name}`);
      }
    } catch (error) {
      // 读不懂的 plist 一律不动。
    }
  }

  for (const [name, source] of expected) {
    const target = path.join(destination, name);
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(source, target, { recursive: true });
    console.log(`  ✓ ${target}`);
  }

  // 让系统重新扫描屏保列表。
  try {
    execFileSync('killall', ['legacyScreenSaver'], { stdio: 'ignore' });
  } catch (error) {
    // 没在运行时 killall 会返回非 0，忽略。
  }

  console.log(`\n已安装 ${expected.size} 个屏保到 ${destination}`);
  console.log('打开「系统设置 → 墙纸 → 屏幕保护程序…」，在列表里选择「流光 · …」。');
}

function runSelfTest(bundles) {
  const harnessSource = path.join(SOURCE_DIR, 'tools', 'SaverHarness.m');
  const harnessBinary = path.join(TMP_DIR, 'SaverHarness');

  console.log('\n▸ 编译渲染自检工具…');
  run('clang', [
    '-fobjc-arc',
    `-mmacosx-version-min=${MIN_MACOS}`,
    '-arch', 'arm64',
    '-o', harnessBinary,
    harnessSource,
    '-framework', 'Cocoa',
    '-framework', 'ScreenSaver',
    '-framework', 'WebKit',
    '-Wl,-undefined,dynamic_lookup',
  ]);

  const outputDir = path.join(TMP_DIR, 'snapshots');
  fs.mkdirSync(outputDir, { recursive: true });

  for (const item of bundles) {
    const slug = path.basename(item.path, '.saver').replace(/[^\w\u4e00-\u9fa5-]+/g, '-');
    const snapshot = path.join(outputDir, `${slug}.png`);
    console.log(`\n▸ 自检 ${item.name}`);
    run(harnessBinary, [item.path, snapshot, '4000'], { stdio: 'inherit' });
  }

  console.log(`\n自检截图：${outputDir}`);
}

function main() {
  if (!fs.existsSync(WALLPAPERS_DIR)) {
    throw new Error(`找不到壁纸目录：${WALLPAPERS_DIR}`);
  }

  fs.mkdirSync(BUILD_DIR, { recursive: true });
  compileHost();

  const wallpapers = discoverWallpapers();
  if (wallpapers.length === 0) {
    throw new Error('没有找到可用的壁纸（需要 <id>/wallpaper.html）。');
  }

  console.log(`\n▸ 构建 ${wallpapers.length} 个屏保…`);
  const bundles = wallpapers.map((wallpaper) => {
    const bundlePath = buildBundle(wallpaper);
    console.log(`  ✓ ${path.basename(bundlePath)}`);
    return { name: wallpaper.bundleName, path: bundlePath };
  });

  if (shouldInstall) {
    console.log('\n▸ 安装到 ~/Library/Screen Savers…');
    installBundles(bundles);
  } else {
    console.log(`\n产物目录：${BUILD_DIR}`);
    console.log('安装：node screensaver/build.js --install');
  }

  if (shouldTest) {
    runSelfTest(bundles);
  }
}

main();
