'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const args = process.argv.slice(2);
let version = '';
let outFile = '';
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--out') {
    outFile = args[index + 1] || '';
    index += 1;
  } else if (!arg.startsWith('-')) {
    version = arg;
  }
}

version = String(version || packageJson.version).replace(/^v/, '');
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const headingPattern = new RegExp(`^\\[?v?${escaped}\\]?(\\s|$)`);

let notes = '';
try {
  const changelog = fs
    .readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
    .replace(/\r\n/g, '\n');
  const collected = [];
  let capturing = false;
  for (const line of changelog.split('\n')) {
    if (/^##\s+/.test(line)) {
      if (capturing) break;
      const heading = line.replace(/^##\s+/, '').trim();
      if (headingPattern.test(heading)) capturing = true;
      continue;
    }
    if (capturing) collected.push(line);
  }
  notes = collected.join('\n').trim();
} catch (error) {
  console.warn('[release-notes] 无法读取 CHANGELOG.md：' + error.message);
}

if (!notes) {
  notes = `### 更新内容\n\n- 本次发布（v${version}）没有单独的更新说明。`;
}

const output = notes.endsWith('\n') ? notes : notes + '\n';
if (outFile) {
  const target = path.resolve(root, outFile);
  fs.writeFileSync(target, output, 'utf8');
  console.log(`[release-notes] 已写入 ${path.relative(root, target)}（v${version}）`);
} else {
  process.stdout.write(output);
}
