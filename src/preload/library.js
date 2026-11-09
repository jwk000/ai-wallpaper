'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const stateListeners = new Set();
const windowListeners = new Set();
const notifyListeners = new Set();
const updateListeners = new Set();

ipcRenderer.on('state:changed', (event, state) => {
  for (const listener of stateListeners) {
    try {
      listener(state);
    } catch {}
  }
});

ipcRenderer.on('window:state', (event, state) => {
  for (const listener of windowListeners) {
    try {
      listener(state);
    } catch {}
  }
});

ipcRenderer.on('app:notify', (event, payload) => {
  for (const listener of notifyListeners) {
    try {
      listener(payload);
    } catch {}
  }
});

ipcRenderer.on('update:state', (event, state) => {
  for (const listener of updateListeners) {
    try {
      listener(state);
    } catch {}
  }
});

function subscribe(set, callback) {
  if (typeof callback !== 'function') return () => {};
  set.add(callback);
  return () => set.delete(callback);
}

contextBridge.exposeInMainWorld('lumen', {
  platform: process.platform,
  getState: () => ipcRenderer.invoke('app:get-state'),
  refresh: () => ipcRenderer.invoke('wallpapers:refresh'),
  apply: (id) => ipcRenderer.invoke('wallpapers:apply', id),
  stop: () => ipcRenderer.invoke('wallpapers:stop'),
  remove: (id) => ipcRenderer.invoke('wallpapers:delete', id),
  preview: (id) => ipcRenderer.invoke('wallpapers:preview', id),
  getOnlineCatalog: (force) => ipcRenderer.invoke('online:get-catalog', { force: Boolean(force) }),
  downloadOnline: (id) => ipcRenderer.invoke('online:download', id),
  openWallpapersFolder: () => ipcRenderer.invoke('app:open-wallpapers-folder'),
  revealWallpaper: (id) => ipcRenderer.invoke('app:reveal-wallpaper', id),
  copyWallpapersPath: () => ipcRenderer.invoke('app:copy-wallpapers-path'),
  openWebView2Download: () => ipcRenderer.invoke('app:open-webview2'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  getUpdateState: () => ipcRenderer.invoke('update:get-state'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  openReleasePage: (url) => ipcRenderer.invoke('update:open-release', url),
  setAutoCheckUpdates: (enabled) => ipcRenderer.invoke('update:set-auto-check', enabled),
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },
  onState: (callback) => subscribe(stateListeners, callback),
  onWindowState: (callback) => subscribe(windowListeners, callback),
  onNotify: (callback) => subscribe(notifyListeners, callback),
  onUpdate: (callback) => subscribe(updateListeners, callback),
});
