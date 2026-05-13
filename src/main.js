'use strict';

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, shell, protocol, net } = require('electron');
const path = require('path');
const url = require('url');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');

// Single-instance lock
const gotSingleInstance = app.requestSingleInstanceLock();
if (!gotSingleInstance) {
  app.quit();
  process.exit(0);
}

// Register a privileged `capy://` scheme BEFORE app.whenReady().
// Renderer can then use `capy://clip/loop_sleep.webp` and
// `capy://sprite/paw_cursor.png` regardless of whether assets live
// loose on disk (dev) or inside `app.asar.unpacked` (packed build).
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'capy',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

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
  // asar is disabled in electron-builder.yml so paths just resolve directly.
  return path.join(__dirname, '..', 'assets', ...parts);
}

// Diagnostic log file, readable from outside the app to debug user reports.
const LOG_FILE = (() => {
  try {
    return path.join(app.getPath('userData'), 'capysaver.log');
  } catch (_e) {
    return null;
  }
})();
function diag(msg) {
  try {
    if (!LOG_FILE) return;
    require('fs').appendFileSync(LOG_FILE, new Date().toISOString() + ' ' + msg + '\n');
  } catch (_e) { /* ignore */ }
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
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadFile(path.join(__dirname, 'overlay', 'overlay.html'));

  // -------- Aggressive renderer-side diagnostics --------
  overlayWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    diag(`renderer-console L${level} ${sourceId}:${line} | ${message}`);
  });
  overlayWindow.webContents.on('preload-error', (_e, preloadPath, err) => {
    diag(`PRELOAD-ERROR ${preloadPath}: ${err && err.stack || err}`);
  });
  overlayWindow.webContents.on('did-finish-load', () => diag('did-finish-load'));
  overlayWindow.webContents.on('dom-ready', () => diag('dom-ready'));
  overlayWindow.webContents.on('render-process-gone', (_e, details) => {
    diag(`render-process-gone: ${JSON.stringify(details)}`);
  });

  // After load, evaluate a tiny script in the renderer to confirm that
  // arbitrary JS execution actually works there. If we never see this
  // entry in the log, the renderer is dead-on-arrival.
  overlayWindow.webContents.once('did-finish-load', () => {
    overlayWindow.webContents.executeJavaScript(`
      (function(){
        try {
          var info = {
            ua: navigator.userAgent.slice(0,80),
            hasWindowCapy: typeof window.capy,
            hasImg: !!document.getElementById('capy'),
            hasDismiss: !!document.getElementById('dismiss'),
            scripts: document.scripts.length,
          };
          if (window.capy && window.capy.diag) window.capy.diag('eval-probe ' + JSON.stringify(info));
          return JSON.stringify(info);
        } catch (e) { return 'eval-err: ' + (e && e.message); }
      })();
    `).then((res) => diag('eval-probe-return ' + String(res).slice(0,300))).catch((err) => diag('eval-probe-throw ' + (err && err.message)));
  });

  // Main-process keyboard escape hatch — works even if the renderer's JS
  // never executed. Esc / Cmd+W / Cmd+Q all close the overlay window.
  overlayWindow.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const k = (input.key || '').toLowerCase();
    const isEscape = k === 'escape' || k === 'esc';
    const isCmdW = (input.meta || input.control) && k === 'w';
    const isCmdQ = (input.meta || input.control) && k === 'q';
    if (isEscape || isCmdW || isCmdQ) {
      diag(`escape-hatch fired key=${k} meta=${!!input.meta} ctrl=${!!input.control}`);
      e.preventDefault();
      if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
    }
  });

  overlayWindow.webContents.on('did-fail-load', (_e, errCode, errDesc, url) => {
    diag(`did-fail-load code=${errCode} desc=${errDesc} url=${url}`);
  });

  overlayWindow.once('ready-to-show', () => {
    diag('overlay ready-to-show');
    overlayWindow.show();
    overlayWindow.focus();
  });

  overlayWindow.on('closed', () => {
    diag('overlay closed');
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
  return 'capy://sprite/' + encodeURIComponent(name);
});

// Return clip as a base64 data URL — bulletproof rendering regardless of
// any path / protocol / asar weirdness. ~3-5 MB per clip, IPC handles it.
ipcMain.handle('capy:clip-url', (_evt, name) => {
  const fs = require('fs');
  try {
    const fullPath = assetPath('clips', name);
    const buf = fs.readFileSync(fullPath);
    diag(`clip-url ok name=${name} bytes=${buf.length} path=${fullPath}`);
    return 'data:image/webp;base64,' + buf.toString('base64');
  } catch (e) {
    diag(`clip-url FAIL name=${name} err=${e && e.message}`);
    return null;
  }
});

// Diagnostic ping from renderer (image load events, errors).
ipcMain.handle('capy:diag', (_evt, msg) => {
  diag('renderer: ' + String(msg).slice(0, 500));
});

// Force-close the overlay — used by the keyboard escape hatch.
ipcMain.handle('capy:overlay-force-close', () => {
  diag('overlay-force-close requested');
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
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
  // Wire up the capy:// scheme to actual filesystem reads.
  // capy://clip/<file>   → assets/clips/<file>
  // capy://sprite/<file> → assets/sprites/<file>
  protocol.handle('capy', (req) => {
    try {
      const u = new URL(req.url);
      const category = u.host;          // 'clip' or 'sprite'
      const fileName = decodeURIComponent(u.pathname.replace(/^\//, ''));
      let dir;
      if (category === 'clip') dir = 'clips';
      else if (category === 'sprite') dir = 'sprites';
      else return new Response('not found', { status: 404 });
      const fullPath = assetPath(dir, fileName);
      return net.fetch(url.pathToFileURL(fullPath).toString());
    } catch (err) {
      return new Response('error: ' + (err && err.message), { status: 500 });
    }
  });

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
