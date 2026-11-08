'use strict';

const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const READY_TIMEOUT = 30000;

function hostExecutable() {
  if (process.env.LUMEN_HOST_EXE) return path.resolve(process.env.LUMEN_HOST_EXE);
  return app.isPackaged
    ? path.join(process.resourcesPath, 'native', 'bin', 'LumenWallpaperHost.exe')
    : path.join(app.getAppPath(), 'native', 'bin', 'LumenWallpaperHost.exe');
}

class WindowsWallpaperHost {
  constructor({ onExit } = {}) {
    this.child = null;
    this.stopping = false;
    this.onExit = onExit || (() => {});
    this.wallpaper = null;
  }

  get running() {
    return Boolean(this.child && !this.child.killed);
  }

  async start(wallpaper) {
    await this.stop();

    const exe = hostExecutable();
    if (!fs.existsSync(exe)) {
      throw new Error(
        '找不到桌面壁纸宿主（native/bin/LumenWallpaperHost.exe）。请在项目目录运行 `npm run build:host` 重新生成。',
      );
    }

    const args = ['--html', wallpaper.htmlPath, '--parent-pid', String(process.pid)];
    if (wallpaper.previewPath && fs.existsSync(wallpaper.previewPath)) {
      args.push('--preview', wallpaper.previewPath);
    }

    const child = spawn(exe, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.child = child;
    this.stopping = false;
    this.wallpaper = wallpaper;

    let stdoutBuffer = '';
    let stderrBuffer = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderrBuffer = (stderrBuffer + chunk).slice(-4000);
    });

    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.stop();
        reject(new Error('桌面壁纸宿主启动超时。请确认已安装 Microsoft Edge WebView2 运行时。'));
      }, READY_TIMEOUT);

      const fail = (message) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.stop();
        reject(new Error(message));
      };

      child.stdout.on('data', (chunk) => {
        stdoutBuffer += chunk;
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let message = null;
          try {
            message = JSON.parse(trimmed);
          } catch {
            continue;
          }
          if (message.ok === false) {
            const detail = String(message.error || '未知错误');
            const friendly = /webview|edge/i.test(detail)
              ? '无法初始化 WebView2。请安装 Microsoft Edge WebView2 运行时后重试。'
              : '桌面壁纸宿主启动失败：' + detail;
            fail(friendly);
            return;
          }
          if (message.ready && !settled) {
            settled = true;
            clearTimeout(timer);
            resolve(message);
          }
        }
      });

      child.on('error', (error) => {
        fail('无法启动桌面壁纸宿主：' + error.message);
      });

      child.on('exit', (code, signal) => {
        if (this.child !== child) return;
        this.child = null;
        if (!settled) {
          const detail = stderrBuffer.trim();
          settled = true;
          clearTimeout(timer);
          reject(
            new Error(
              '桌面壁纸宿主意外退出' +
                (code != null ? `（代码 ${code}）` : '') +
                (detail ? '：' + detail.split(/\r?\n/).slice(-2).join(' ') : ''),
            ),
          );
          return;
        }
        if (!this.stopping) {
          this.onExit({ code, signal, wallpaper: this.wallpaper });
        }
      });
    });
  }

  async stop() {
    const child = this.child;
    this.stopping = true;
    this.child = null;
    this.wallpaper = null;
    if (!child || child.exitCode != null) return;

    await new Promise((resolve) => {
      let done = false;
      let forceTimer = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (forceTimer) clearTimeout(forceTimer);
        resolve();
      };
      child.once('exit', finish);
      try {
        child.kill();
      } catch {}
      forceTimer = setTimeout(() => {
        try {
          execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => {});
        } catch {}
        setTimeout(finish, 400);
      }, 1200);
    });
  }
}

module.exports = { WindowsWallpaperHost, hostExecutable };
