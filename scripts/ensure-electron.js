'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron');
const relative =
  process.platform === 'win32'
    ? 'dist/electron.exe'
    : process.platform === 'darwin'
      ? 'dist/Electron.app/Contents/MacOS/Electron'
      : 'dist/electron';
const executable = path.join(electronDir, relative);

if (fs.existsSync(executable)) {
  process.exit(0);
}

if (!fs.existsSync(path.join(electronDir, 'install.js'))) {
  console.warn('[流光] 未安装 Electron，跳过二进制检查。');
  process.exit(0);
}

if (process.argv.includes('--install')) {
  process.env.ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
  console.log('[流光] 正在从镜像下载 Electron：' + process.env.ELECTRON_MIRROR);
  const result = spawnSync(process.execPath, [path.join(electronDir, 'install.js')], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status == null ? 0 : result.status);
}

console.warn(
  '\n[流光] Electron 可执行文件缺失。\n' +
    '  运行 `npm run setup:electron` 下载，或设置 ELECTRON_MIRROR 后重新安装：\n' +
    '  set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/\n\n',
);
