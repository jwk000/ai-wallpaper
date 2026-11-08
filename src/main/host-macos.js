'use strict';

const { BrowserWindow, screen } = require('electron');

class MacWallpaperHost {
  constructor({ onExit } = {}) {
    this.windows = [];
    this.stopping = false;
    this.onExit = onExit || (() => {});
    this.wallpaper = null;
  }

  get running() {
    return this.windows.length > 0;
  }

  async start(wallpaper) {
    await this.stop();
    this.stopping = false;
    this.wallpaper = wallpaper;

    const displays = screen.getAllDisplays();
    try {
      for (const display of displays) {
        const win = this.createWindow(display, wallpaper);
        this.windows.push(win);
      }
      await Promise.all(this.windows.map((win) => win.loadFile(wallpaper.htmlPath)));
      for (const win of this.windows) {
        if (win.isDestroyed()) continue;
        // showInactive() keeps the user's current app focused; a desktop-level
        // window is visible without becoming key.
        win.showInactive();
        win.setIgnoreMouseEvents(true);
      }
    } catch (error) {
      await this.stop();
      throw new Error('无法创建 macOS 桌面壁纸窗口：' + error.message);
    }
  }

  createWindow(display, wallpaper) {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      show: false,
      frame: false,
      type: 'desktop',
      focusable: false,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: '#000000',
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required',
        devTools: false,
      },
    });

    win.setMenuBarVisibility(false);
    if (typeof win.setWindowButtonVisibility === 'function') win.setWindowButtonVisibility(false);
    win.setIgnoreMouseEvents(true);
    try {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false, skipTransformProcessType: true });
    } catch {}

    win.on('closed', () => {
      this.windows = this.windows.filter((candidate) => candidate !== win);
      if (!this.stopping && this.windows.length === 0) {
        this.onExit({ code: 0, signal: null, wallpaper });
      }
    });

    return win;
  }

  async stop() {
    this.stopping = true;
    const windows = this.windows.slice();
    this.windows = [];
    this.wallpaper = null;
    for (const win of windows) {
      if (win.isDestroyed()) continue;
      try {
        win.destroy();
      } catch {}
    }
  }
}

module.exports = { MacWallpaperHost };
