'use strict';

const fs = require('fs');
const path = require('path');

class ConfigStore {
  constructor(filePath, defaults = {}) {
    this.filePath = filePath;
    this.defaults = defaults;
    this.data = this.read();
  }

  read() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return { ...this.defaults, ...raw };
      }
    } catch {}
    return { ...this.defaults };
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  merge(patch) {
    Object.assign(this.data, patch);
    this.save();
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const temporary = this.filePath + '.tmp';
      fs.writeFileSync(temporary, JSON.stringify(this.data, null, 2) + '\n', 'utf8');
      fs.renameSync(temporary, this.filePath);
    } catch (error) {
      console.warn('[流光] 保存配置失败：', error.message);
    }
  }
}

module.exports = { ConfigStore };
