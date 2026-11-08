'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const stateListeners = new Set();
const windowListeners = new Set();
const notifyListeners = new Set();

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
  preview: (id) => ipcRenderer.invoke('wallpapers:preview', id),
  openWallpapersFolder: () => ipcRenderer.invoke('app:open-wallpapers-folder'),
  revealWallpaper: (id) => ipcRenderer.invoke('app:reveal-wallpaper', id),
  copyWallpapersPath: () => ipcRenderer.invoke('app:copy-wallpapers-path'),
  openWebView2Download: () => ipcRenderer.invoke('app:open-webview2'),
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },
  onState: (callback) => subscribe(stateListeners, callback),
  onWindowState: (callback) => subscribe(windowListeners, callback),
  onNotify: (callback) => subscribe(notifyListeners, callback),
});
