'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('capy', {
  getSettings: () => ipcRenderer.invoke('capy:get-settings'),
  saveSettings: (next) => ipcRenderer.invoke('capy:save-settings', next),
  overlayDismissed: () => ipcRenderer.invoke('capy:overlay-dismissed'),
  overlaySnooze: () => ipcRenderer.invoke('capy:overlay-snooze'),
  overlayForceClose: () => ipcRenderer.invoke('capy:overlay-force-close'),
  assetUrl: (name) => ipcRenderer.invoke('capy:asset-url', name),
  clipUrl: (name) => ipcRenderer.invoke('capy:clip-url', name),
  diag: (msg) => ipcRenderer.invoke('capy:diag', msg),
});
