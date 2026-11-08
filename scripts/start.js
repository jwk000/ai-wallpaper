'use strict';

const { spawn } = require('child_process');
const path = require('path');

let electronPath;
try {
  electronPath = require('electron');
} catch (error) {
  console.error('[流光] 找不到 Electron，请先运行 npm install。');
  process.exit(1);
}

if (typeof electronPath !== 'string') {
  electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
}

const env = { ...process.env };
// Some environments (including the harness that built this project) set this,
// which makes electron.exe behave like plain Node.
delete env.ELECTRON_RUN_AS_NODE;

const args = [path.join(__dirname, '..')];
if (process.argv.includes('--dev')) args.push('--dev');

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  env,
  windowsHide: false,
});

child.on('close', (code) => {
  process.exit(code == null ? 0 : code);
});
