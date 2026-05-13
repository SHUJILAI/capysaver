'use strict';

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');

// Single-instance lock
const gotSingleInstance = app.requestSingleInstanceLock();
if (!gotSingleInstance) {
  app.quit();
  process.exit(0);
}

const store = new Store({
  defaults: {
    enabled: true,
    triggerMode: 'interval', // 'interval' | 'time'
    intervalMinutes: 45,
    timeOfDay: '14:00',
    autoLaunch: false,
    napsToday: 0,
    napsDate: new Date().toDateString(),
  },
});

const autoLauncher = new AutoLaunch({ name: 'CapySaver' });

let tray = null;
let overlayWindow = null;
let settingsWindow = null;
let scheduleTimer = null;
let snoozeUntil = 0;

function assetPath(...parts) {
  return path.join(__dirname, '..', 'assets', ...parts);
}

function ensureNapsDate() {
  const today = new Date().toDateString();
  if (store.get('napsDate') !== today) {
    store.set('napsDate', today);
    store.set('napsToday', 0);
  }
}

function buildTrayMenu() {
  ensureNapsDate();
  const enabled = store.get('enabled');
  const naps = store.get('napsToday');
  const snoozeActive = Date.now() < snoozeUntil;
  const snoozeLabel = snoozeActive
    ? `Snoozing (${Math.ceil((snoozeUntil - Date.now()) / 60000)}m left)`
    : 'Snooze 10 min';

  return Menu.buildFromTemplate([
    { label: `Naps today: ${naps}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Enable CapySaver',
      type: 'checkbox',
      checked: enabled,
      click: (item) => {
        store.set('enabled', item.checked);
        rescheduleNextNap();
        refreshTray();
      },
    },
    {
      label: snoozeLabel,
      enabled: !snoozeActive,
      click: () => {
        snoozeUntil = Date.now() + 10 * 60 * 1000;
        rescheduleNextNap();
        refreshTray();
      },
    },
    { type: 'separator' },
    { label: 'Take a nap now', click: () => openOverlay() },
    { label: 'Settings…', click: () => openSettings() },
    { type: 'separator' },
    { label: 'About CapySaver', click: () => shell.openExternal('https://happycapy.ai/capysaver') },
    { label: 'Quit CapySaver', click: () => { app.quit(); } },
  ]);
}

function refreshTray() {
  if (!tray) return;
  ensureNapsDate();
  tray.setToolTip(`CapySaver — ${store.get('napsToday')} naps today`);
  tray.setContextMenu(buildTrayMenu());
}

function computeNextFireMs() {
  if (!store.get('enabled')) return null;
  const now = Date.now();
  const mode = store.get('triggerMode');
  let fireAt;
  if (mode === 'time') {
    const [hh, mm] = (store.get('timeOfDay') || '14:00').split(':').map((n) => parseInt(n, 10));
    const d = new Date();
    d.setHours(hh || 0, mm || 0, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    fireAt = d.getTime();
  } else {
    const interval = Math.max(1, parseInt(store.get('intervalMinutes'), 10) || 45);
    fireAt = now + interval * 60 * 1000;
  }
  if (fireAt < snoozeUntil) fireAt = snoozeUntil;
  return fireAt;
}

function rescheduleNextNap() {
  if (scheduleTimer) {
    clearTimeout(scheduleTimer);
    scheduleTimer = null;
  }
  const fireAt = computeNextFireMs();
  if (!fireAt) return;
  const delay = Math.max(1000, fireAt - Date.now());
  scheduleTimer = setTimeout(() => {
    openOverlay();
    // After the overlay is dismissed we'll reschedule from onOverlayDismissed.
  }, delay);
}

function openOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus();
    return;
  }
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.bounds;

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: display.bounds.x,
    y: display.bounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: true,
    hasShadow: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadFile(path.join(__dirname, 'overlay', 'overlay.html'));

  overlayWindow.once('ready-to-show', () => {
    overlayWindow.show();
    overlayWindow.focus();
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    rescheduleNextNap();
  });
}

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 420,
    height: 480,
    title: 'CapySaver Settings',
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(__dirname, 'settings', 'settings.html'));
  settingsWindow.on('closed', () => {
    settingsWindow = null;
    rescheduleNextNap();
    refreshTray();
  });
}

// ------------- IPC -------------

ipcMain.handle('capy:get-settings', () => ({
  enabled: store.get('enabled'),
  triggerMode: store.get('triggerMode'),
  intervalMinutes: store.get('intervalMinutes'),
  timeOfDay: store.get('timeOfDay'),
  autoLaunch: store.get('autoLaunch'),
}));

ipcMain.handle('capy:save-settings', async (_evt, next) => {
  if (typeof next.enabled === 'boolean') store.set('enabled', next.enabled);
  if (next.triggerMode === 'interval' || next.triggerMode === 'time') store.set('triggerMode', next.triggerMode);
  if (Number.isFinite(next.intervalMinutes)) store.set('intervalMinutes', Math.max(1, Math.floor(next.intervalMinutes)));
  if (typeof next.timeOfDay === 'string' && /^\d{1,2}:\d{2}$/.test(next.timeOfDay)) store.set('timeOfDay', next.timeOfDay);
  if (typeof next.autoLaunch === 'boolean') {
    store.set('autoLaunch', next.autoLaunch);
    try {
      if (next.autoLaunch) await autoLauncher.enable();
      else await autoLauncher.disable();
    } catch (err) {
      console.warn('auto-launch toggle failed:', err.message);
    }
  }
  rescheduleNextNap();
  refreshTray();
  return true;
});

ipcMain.handle('capy:overlay-dismissed', () => {
  ensureNapsDate();
  store.set('napsToday', (store.get('napsToday') || 0) + 1);
  refreshTray();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
});

ipcMain.handle('capy:overlay-snooze', () => {
  snoozeUntil = Date.now() + 10 * 60 * 1000;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  refreshTray();
});

ipcMain.handle('capy:asset-url', (_evt, name) => {
  return 'file://' + assetPath('sprites', name);
});

ipcMain.handle('capy:clip-url', (_evt, name) => {
  return 'file://' + assetPath('clips', name);
});

// ------------- App lifecycle -------------

function initTray() {
  const iconImg = nativeImage
    .createFromPath(assetPath('sprites', 'capy_icon.png'))
    .resize({ width: 18, height: 18 });
  tray = new Tray(iconImg.isEmpty() ? nativeImage.createEmpty() : iconImg);
  tray.setToolTip('CapySaver');
  tray.setContextMenu(buildTrayMenu());
  refreshTray();
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide(); // menu-bar app
  }
  initTray();
  rescheduleNextNap();

  app.on('activate', () => {
    if (!tray) initTray();
  });
});

app.on('second-instance', () => {
  if (settingsWindow) settingsWindow.focus();
});

app.on('window-all-closed', (e) => {
  // keep the tray app alive
  e.preventDefault && e.preventDefault();
});
