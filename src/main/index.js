'use strict';

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  clipboard,
  dialog,
  ipcMain,
  nativeImage,
  screen,
  shell,
} = require('electron');
const fs = require('fs');
const path = require('path');
const { ConfigStore } = require('./config');
const { scanWallpapers, seedWallpapers } = require('./library');
const { WindowsWallpaperHost } = require('./host-windows');
const { MacWallpaperHost } = require('./host-macos');

const PRODUCT_NAME = '流光壁纸';
const isDev = process.argv.includes('--dev');

let mainWindow = null;
let previewWindow = null;
let previewItemId = null;
let tray = null;

let config = null;
let wallpapersDir = '';
let wallpapers = [];
let problems = [];
let currentId = null;
let currentUpdatedAt = 0;

let host = null;
let hostStatus = 'idle'; // idle | starting | running | error
let hostError = '';
let restartTimer = null;
let restartAttempts = 0;

let watcher = null;
let watchTimer = null;
let boundsTimer = null;
let displayTimer = null;
let shuttingDown = false;
let isQuitting = false;
let trayHintShown = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!app.isReady()) return;
    if (!config) {
      setTimeout(() => showMainWindow(), 700);
      return;
    }
    showMainWindow();
  });
}

function wallpapersDirectory() {
  if (process.env.LUMEN_WALLPAPERS_DIR) {
    const custom = path.resolve(process.env.LUMEN_WALLPAPERS_DIR);
    fs.mkdirSync(custom, { recursive: true });
    return custom;
  }
  if (!app.isPackaged && process.env.LUMEN_USE_USERDATA !== '1') {
    return path.join(app.getAppPath(), 'wallpapers');
  }
  const target = path.join(app.getPath('userData'), 'wallpapers');
  const bundled = path.join(
    process.resourcesPath,
    'bundled-wallpapers',
  );
  seedWallpapers(target, bundled);
  return target;
}

function scan(announce = false) {
  const result = scanWallpapers(wallpapersDir);
  wallpapers = result.wallpapers;
  problems = result.problems;

  if (currentId) {
    const current = wallpapers.find((item) => item.id === currentId);
    if (!current) {
      currentId = null;
      currentUpdatedAt = 0;
      config.set('current', null);
      if (host) host.stop();
      hostStatus = 'idle';
      hostError = '';
    } else {
      currentUpdatedAt = current.updatedAt;
    }
  }

  if (announce) broadcast();
}

function stateSnapshot() {
  return {
    wallpapers,
    problems,
    currentId,
    currentUpdatedAt,
    hostStatus,
    hostError,
    platform: process.platform,
    version: app.getVersion(),
    productName: PRODUCT_NAME,
    wallpapersDir,
    isDev,
    isPackaged: app.isPackaged,
  };
}

function broadcast() {
  const state = stateSnapshot();
  const windows = [mainWindow, previewWindow];
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      try {
        win.webContents.send('state:changed', state);
      } catch {}
    }
  }
  rebuildTrayMenu();
}

function notifyMainWindow(message, type = 'info') {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.webContents.send('app:notify', { message, type });
  } catch {}
}

function currentWallpaper() {
  return wallpapers.find((item) => item.id === currentId) || null;
}

function sanitizeBounds(value) {
  if (!value || !Number.isFinite(value.width) || !Number.isFinite(value.height)) return null;
  if (value.width < 900 || value.height < 600) return null;
  const visible = screen.getAllDisplays().some((display) => {
    const area = display.workArea;
    const right = value.x + value.width;
    const bottom = value.y + value.height;
    return (
      value.x < area.x + area.width &&
      right > area.x &&
      value.y < area.y + area.height &&
      bottom > area.y
    );
  });
  if (!visible) return null;
  return {
    x: Math.round(value.x),
    y: Math.round(value.y),
    width: Math.round(value.width),
    height: Math.round(value.height),
  };
}

function saveWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMaximized() || mainWindow.isFullScreen()) return;
  const bounds = mainWindow.getBounds();
  config.set('windowBounds', bounds);
}

function scheduleBoundsSave() {
  if (boundsTimer) clearTimeout(boundsTimer);
  boundsTimer = setTimeout(saveWindowBounds, 400);
}

function createMainWindow() {
  const saved = sanitizeBounds(config.get('windowBounds'));
  const options = {
    width: saved ? saved.width : 1360,
    height: saved ? saved.height : 880,
    minWidth: 1040,
    minHeight: 660,
    show: false,
    backgroundColor: '#07080a',
    title: PRODUCT_NAME,
    icon: path.join(app.getAppPath(), 'assets', 'icon.png'),
    autoHideMenuBar: true,
    frame: process.platform !== 'win32',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 20, y: 22 },
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'library.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  };
  if (saved) {
    options.x = saved.x;
    options.y = saved.y;
  }

  mainWindow = new BrowserWindow(options);
  if (process.platform === 'win32') mainWindow.setMenuBarVisibility(false);
  if (!saved) mainWindow.center();

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('resize', scheduleBoundsSave);
  mainWindow.on('move', scheduleBoundsSave);
  mainWindow.on('maximize', () => sendWindowState());
  mainWindow.on('unmaximize', () => {
    sendWindowState();
    scheduleBoundsSave();
  });
  mainWindow.on('enter-full-screen', () => sendWindowState());
  mainWindow.on('leave-full-screen', () => {
    sendWindowState();
    scheduleBoundsSave();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (!trayHintShown && process.platform === 'win32' && tray) {
        trayHintShown = true;
        try {
          tray.displayBalloon({
            title: '流光壁纸仍在运行',
            content: '动态壁纸会继续播放。点击托盘图标可重新打开壁纸库。',
          });
        } catch {}
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });

  return mainWindow;
}

function sendWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('window:state', {
    maximized: mainWindow.isMaximized(),
    fullScreen: mainWindow.isFullScreen(),
  });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  const iconFile = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png';
  let image = nativeImage.createFromPath(path.join(app.getAppPath(), 'assets', iconFile));
  if (process.platform === 'darwin') image.setTemplateImage(true);
  if (image.isEmpty()) {
    image = nativeImage.createFromPath(path.join(app.getAppPath(), 'assets', 'icon.png'));
    image = image.resize({ width: 16, height: 16 });
  }
  tray = new Tray(image);
  tray.setToolTip(PRODUCT_NAME);
  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  if (!tray) return;
  const current = currentWallpaper();
  const template = [
    { label: '打开壁纸库', click: () => showMainWindow() },
    { type: 'separator' },
    {
      label: current ? `正在播放：${current.title}` : '尚未应用壁纸',
      enabled: false,
    },
    {
      label: '停止动态壁纸',
      enabled: Boolean(current),
      click: () => {
        stopWallpaper();
      },
    },
    { type: 'separator' },
    {
      label: '打开壁纸目录',
      click: () => shell.openPath(wallpapersDir),
    },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function createHost() {
  const onExit = ({ code, signal }) => handleHostExit(code, signal);
  if (process.platform === 'win32') return new WindowsWallpaperHost({ onExit });
  if (process.platform === 'darwin') return new MacWallpaperHost({ onExit });
  return null;
}

async function startHost(item) {
  if (!host) {
    throw new Error('当前平台暂不支持动态桌面壁纸。');
  }
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  hostStatus = 'starting';
  hostError = '';
  broadcast();
  try {
    await host.start(item);
    hostStatus = 'running';
    hostError = '';
    restartAttempts = 0;
    broadcast();
  } catch (error) {
    hostStatus = 'error';
    hostError = error.message;
    broadcast();
    throw error;
  }
}

function handleHostExit(code, signal) {
  if (shuttingDown || isQuitting) return;
  if (hostStatus === 'starting') return;

  hostStatus = 'error';
  hostError = '桌面壁纸宿主已退出' + (code ? `（代码 ${code}）` : '');
  broadcast();

  if (restartAttempts >= 3 || !currentId) return;
  const item = currentWallpaper();
  if (!item) return;
  restartAttempts += 1;
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(async () => {
    restartTimer = null;
    if (!currentId || isQuitting) return;
    try {
      hostStatus = 'starting';
      broadcast();
      await host.start(item);
      hostStatus = 'running';
      hostError = '';
      restartAttempts = 0;
      broadcast();
    } catch (error) {
      hostStatus = 'error';
      hostError = error.message;
      broadcast();
    }
  }, 1800);
}

async function applyWallpaper(id) {
  const item = wallpapers.find((entry) => entry.id === id);
  if (!item) {
    return { ok: false, error: '没有找到这幅壁纸。', state: stateSnapshot() };
  }
  if (currentId === id && hostStatus === 'running') {
    return { ok: true, state: stateSnapshot() };
  }

  const previousId = currentId;
  const previousItem = previousId ? wallpapers.find((entry) => entry.id === previousId) : null;

  currentId = id;
  currentUpdatedAt = item.updatedAt;
  config.set('current', id);

  try {
    await startHost(item);
    restartAttempts = 0;
    broadcast();
    return { ok: true, state: stateSnapshot() };
  } catch (error) {
    currentId = previousId;
    config.set('current', previousId);
    if (previousItem) {
      try {
        await startHost(previousItem);
      } catch {
        hostStatus = 'error';
      }
    } else {
      hostStatus = 'error';
    }
    broadcast();
    return { ok: false, error: error.message, state: stateSnapshot() };
  }
}

async function stopWallpaper() {
  currentId = null;
  currentUpdatedAt = 0;
  config.set('current', null);
  restartAttempts = 0;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  hostStatus = 'idle';
  hostError = '';
  if (host) {
    try {
      await host.stop();
    } catch {}
  }
  broadcast();
  return { ok: true, state: stateSnapshot() };
}

function startWatcher() {
  try {
    watcher = fs.watch(wallpapersDir, { recursive: true }, () => {
      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        watchTimer = null;
        const previousCurrent = currentId;
        const previousUpdatedAt = currentUpdatedAt;
        scan(false);
        if (previousCurrent && previousCurrent === currentId && currentUpdatedAt !== previousUpdatedAt) {
          const item = currentWallpaper();
          if (item && hostStatus === 'running') {
            startHost(item).catch(() => {});
          }
        }
        broadcast();
      }, 500);
    });
    watcher.on('error', () => {});
  } catch (error) {
    console.warn('[流光] 无法监听壁纸目录：', error.message);
  }
}

function stopWatcher() {
  if (watcher) {
    try {
      watcher.close();
    } catch {}
    watcher = null;
  }
  if (watchTimer) {
    clearTimeout(watchTimer);
    watchTimer = null;
  }
}

function scheduleDisplayRestart() {
  if (displayTimer) clearTimeout(displayTimer);
  displayTimer = setTimeout(async () => {
    displayTimer = null;
    if (!currentId || !host || hostStatus !== 'running') return;
    const item = currentWallpaper();
    if (!item) return;
    try {
      await startHost(item);
    } catch (error) {
      hostStatus = 'error';
      hostError = error.message;
      broadcast();
    }
  }, 800);
}

function openPreview(id) {
  const item = wallpapers.find((entry) => entry.id === id);
  if (!item) return { ok: false, error: '没有找到这幅壁纸。' };

  closePreview();

  const display = screen.getDisplayMatching(
    mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : screen.getPrimaryDisplay().bounds,
  );
  const bounds = display.bounds;

  previewItemId = id;
  previewWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: false,
    frame: false,
    backgroundColor: '#000000',
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    roundedCorners: false,
    title: item.title,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preview.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
      additionalArguments: [`--lumen-preview-title=${encodeURIComponent(item.title)}`],
    },
  });

  previewWindow.setMenuBarVisibility(false);
  previewWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  previewWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
    }
  });
  previewWindow.loadFile(item.htmlPath);

  previewWindow.once('ready-to-show', () => {
    if (!previewWindow || previewWindow.isDestroyed()) return;
    previewWindow.show();
    previewWindow.focus();
  });

  previewWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault();
      closePreview();
    }
  });

  previewWindow.webContents.on('did-fail-load', (event, code, description, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (!previewWindow || previewWindow.isDestroyed()) return;
    closePreview();
    notifyMainWindow('预览加载失败：' + description, 'error');
  });

  previewWindow.on('closed', () => {
    previewWindow = null;
    previewItemId = null;
  });

  return { ok: true };
}

function closePreview() {
  if (previewWindow && !previewWindow.isDestroyed()) {
    const win = previewWindow;
    previewWindow = null;
    previewItemId = null;
    try {
      win.destroy();
    } catch {}
  }
}

function registerIpc() {
  ipcMain.handle('app:get-state', () => stateSnapshot());

  ipcMain.handle('wallpapers:refresh', () => {
    scan(true);
    return { ok: true, state: stateSnapshot() };
  });

  ipcMain.handle('wallpapers:apply', async (event, id) => {
    if (typeof id !== 'string') return { ok: false, error: '无效的壁纸 ID。', state: stateSnapshot() };
    return applyWallpaper(id);
  });

  ipcMain.handle('wallpapers:stop', async () => stopWallpaper());

  ipcMain.handle('wallpapers:preview', (event, id) => {
    if (typeof id !== 'string') return { ok: false, error: '无效的壁纸 ID。' };
    return openPreview(id);
  });

  ipcMain.handle('preview:close', () => {
    closePreview();
  });

  ipcMain.handle('preview:apply', async () => {
    const id = previewItemId;
    if (!id) return { ok: false, error: '预览已关闭。' };
    const result = await applyWallpaper(id);
    if (result.ok) {
      closePreview();
      showMainWindow();
    }
    return result;
  });

  ipcMain.handle('app:open-wallpapers-folder', async () => {
    const error = await shell.openPath(wallpapersDir);
    return { ok: !error, error };
  });

  ipcMain.handle('app:reveal-wallpaper', (event, id) => {
    const item = wallpapers.find((entry) => entry.id === id);
    if (!item) return { ok: false };
    shell.showItemInFolder(item.htmlPath);
    return { ok: true };
  });

  ipcMain.handle('app:copy-wallpapers-path', () => {
    clipboard.writeText(wallpapersDir);
    return { ok: true, path: wallpapersDir };
  });

  ipcMain.handle('app:open-webview2', () => {
    shell.openExternal('https://developer.microsoft.com/microsoft-edge/webview2/');
    return { ok: true };
  });

  ipcMain.handle('window:minimize', () => mainWindow && mainWindow.minimize());
  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
  });
  ipcMain.handle('window:is-maximized', () => Boolean(mainWindow && mainWindow.isMaximized()));
}

async function cleanup() {
  stopWatcher();
  closePreview();
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  if (host) {
    try {
      await host.stop();
    } catch {}
    host = null;
  }
  saveWindowBounds();
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

app.whenReady().then(async () => {
  if (!gotLock) return;
  app.setAppUserModelId('com.lumen.wallpaper');
  Menu.setApplicationMenu(
    process.platform === 'darwin'
      ? Menu.buildFromTemplate([
          {
            label: PRODUCT_NAME,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { label: '退出', accelerator: 'Command+Q', click: () => { isQuitting = true; app.quit(); } },
            ],
          },
          { role: 'editMenu' },
          { role: 'windowMenu' },
        ])
      : null,
  );

  config = new ConfigStore(path.join(app.getPath('userData'), 'config.json'), {
    current: null,
    windowBounds: null,
  });
  wallpapersDir = wallpapersDirectory();
  scan(false);

  currentId = typeof config.get('current') === 'string' ? config.get('current') : null;
  const restored = currentWallpaper();
  if (!restored) {
    currentId = null;
    config.set('current', null);
  } else {
    currentUpdatedAt = restored.updatedAt;
  }

  host = createHost();
  registerIpc();
  createMainWindow();
  createTray();
  startWatcher();

  screen.on('display-metrics-changed', scheduleDisplayRestart);
  screen.on('display-added', scheduleDisplayRestart);
  screen.on('display-removed', scheduleDisplayRestart);

  if (restored) {
    hostStatus = 'starting';
    setTimeout(() => {
      if (!currentId) return;
      startHost(restored).catch((error) => {
        hostStatus = 'error';
        hostError = error.message;
        broadcast();
      });
    }, 900);
  }
}).catch((error) => {
  console.error('[流光] 启动失败：', error);
  try {
    dialog.showErrorBox('流光壁纸启动失败', error.stack || error.message || String(error));
  } catch {}
  isQuitting = true;
  app.quit();
});

app.on('before-quit', (event) => {
  if (shuttingDown) return;
  event.preventDefault();
  shuttingDown = true;
  isQuitting = true;
  cleanup().finally(() => {
    app.quit();
  });
});

app.on('window-all-closed', () => {
  // The tray keeps the engine alive so the desktop wallpaper keeps playing.
});

app.on('activate', () => {
  if (config) showMainWindow();
});
