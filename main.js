const {
  app, BrowserWindow, ipcMain, globalShortcut, screen, dialog, Tray, Menu, shell
} = require('electron');
const path = require('path');
const fs = require('fs');
const ocr = require('./ocr');
const { tesseractLangPath } = require('./paths');

let win = null;
let tray = null;
let clickThrough = false;
let expandedHeight = null;
let isQuitting = false;

const DEFAULT_BOUNDS = { width: 300, height: 340 };
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');
const ocrConfigFile = () => path.join(app.getPath('userData'), 'ocr-config.json');
const ocrSettingsFile = () => path.join(app.getPath('userData'), 'ocr-settings.json');
const userGuidesFile = () => path.join(app.getPath('userData'), 'guides-user.json');
const bundledGuidesPath = () => path.join(__dirname, 'data', 'guides.json');

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}

function loadWindowState() {
  try {
    const saved = loadJson(stateFile(), DEFAULT_BOUNDS);
    if (typeof saved.width !== 'number') return DEFAULT_BOUNDS;
    const display = screen.getDisplayMatching(saved).workArea;
    const visible =
      saved.x >= display.x - saved.width + 40 &&
      saved.x <= display.x + display.width - 40 &&
      saved.y >= display.y &&
      saved.y <= display.y + display.height - 40;
    return visible ? saved : { width: saved.width, height: saved.height };
  } catch (_) {
    return DEFAULT_BOUNDS;
  }
}

let saveTimer = null;
let loadedBounds = null;

function saveWindowState() {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  if (expandedHeight !== null) bounds.height = expandedHeight;
  if (loadedBounds) {
    for (const k of ['x', 'y', 'width', 'height']) {
      if (typeof loadedBounds[k] === 'number' && Math.abs(bounds[k] - loadedBounds[k]) <= 8) {
        bounds[k] = loadedBounds[k];
      }
    }
  }
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(bounds));
    loadedBounds = bounds;
  } catch (_) { /* ignore */ }
}

function saveWindowStateDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveWindowState, 500);
}

function loadOcrConfig() {
  return loadJson(ocrConfigFile(), null);
}

function loadOcrSettings() {
  const s = loadJson(ocrSettingsFile(), {});
  ocr.setSettings(s);
  return ocr.getSettings();
}

function mergeGuides() {
  const bundled = loadJson(bundledGuidesPath(), { version: '1.0.0', guides: [] });
  const user = loadJson(userGuidesFile(), { guides: [] });
  const byId = new Map(bundled.guides.map((g) => [g.id, g]));
  (user.guides || []).forEach((g) => byId.set(g.id, g));
  return { ...bundled, guides: [...byId.values()] };
}

function createTray() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  if (!fs.existsSync(iconPath)) return;
  tray = new Tray(iconPath);
  tray.setToolTip('Maplebot');
  const menu = Menu.buildFromTemplate([
    { label: 'Show Overlay', click: () => { if (win) { win.show(); win.focus(); } } },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => { if (win) { win.show(); win.focus(); } });
}

function createWindow() {
  loadedBounds = loadWindowState();
  win = new BrowserWindow({
    ...loadedBounds,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('moved', saveWindowStateDebounced);
  win.on('resized', saveWindowStateDebounced);
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
      return;
    }
    clearTimeout(saveTimer);
    saveWindowState();
  });
}

function registerShortcuts() {
  globalShortcut.register('F8', () => {
    if (!win || win.isDestroyed()) return;
    clickThrough = !clickThrough;
    win.setIgnoreMouseEvents(clickThrough, { forward: true });
    win.webContents.send('lock-changed', clickThrough);
  });
  globalShortcut.register('F9', () => {
    if (win && !win.isDestroyed()) win.webContents.send('hotkey', 'cycle-guide');
  });
  globalShortcut.register('F10', () => {
    if (win && !win.isDestroyed()) win.webContents.send('hotkey', 'toggle-library');
  });
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-available', { version: info.version });
      }
    });
    autoUpdater.on('download-progress', (p) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-progress', Math.round(p.percent));
      }
    });
    autoUpdater.on('update-downloaded', (info) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-downloaded', { version: info.version });
      }
    });
    autoUpdater.on('error', (err) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-error', err.message || 'Update check failed');
      }
    });

    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000);
  } catch (_) { /* optional */ }
}

let autoUpdaterRef = null;
function getAutoUpdater() {
  if (!app.isPackaged) return null;
  if (!autoUpdaterRef) {
    try { autoUpdaterRef = require('electron-updater').autoUpdater; } catch (_) { return null; }
  }
  return autoUpdaterRef;
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  loadOcrSettings();
  ocr.setCalibration(loadOcrConfig());
  ocr.setStatusListener((s) => {
    if (win && !win.isDestroyed()) win.webContents.send('ocr-status-changed', s);
  });
  ocr.setResultListener((r) => {
    if (win && !win.isDestroyed()) win.webContents.send('ocr-result', r);
  });
  ocr.setPauseCheck(() => expandedHeight !== null);
  registerShortcuts();
  setupAutoUpdater();
});

// ---------- IPC: guides ----------
ipcMain.handle('get-guides', () => mergeGuides());

ipcMain.handle('save-user-guides', (_e, guides) => {
  fs.writeFileSync(userGuidesFile(), JSON.stringify({ guides }, null, 2));
  return { ok: true };
});

const DB_FILES = ['maps', 'npcs', 'monsters', 'items', 'quests', 'bosses', 'training'];
ipcMain.handle('get-database', () => {
  const out = {};
  for (const name of DB_FILES) {
    try {
      out[name] = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'database', `${name}.json`), 'utf8'));
    } catch (_) {
      out[name] = null;
    }
  }
  return out;
});

ipcMain.handle('get-displays', () =>
  screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: `Monitor ${i + 1} (${d.size.width}x${d.size.height})`,
    primary: d.id === screen.getPrimaryDisplay().id
  }))
);

ipcMain.on('set-opacity', (_e, value) => {
  if (!win || win.isDestroyed()) return;
  win.setOpacity(Math.min(1, Math.max(0.3, value)));
});

ipcMain.on('set-always-on-top-level', (_e, level) => {
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(true, level === 'normal' ? 'normal' : 'screen-saver');
});

ipcMain.on('toggle-lock', () => {
  if (!win || win.isDestroyed()) return;
  clickThrough = !clickThrough;
  win.setIgnoreMouseEvents(clickThrough, { forward: true });
  win.webContents.send('lock-changed', clickThrough);
});

ipcMain.on('set-collapsed', (_e, collapsed, collapsedHeight) => {
  if (!win || win.isDestroyed()) return;
  const [width, height] = win.getSize();
  if (collapsed) {
    expandedHeight = height;
    win.setSize(width, Math.max(24, Math.round(collapsedHeight)));
    win.setResizable(false);
  } else {
    win.setResizable(true);
    win.setSize(width, expandedHeight || DEFAULT_BOUNDS.height);
    expandedHeight = null;
  }
});

ipcMain.on('minimize-to-tray', () => { if (win) win.hide(); });

ipcMain.on('quit-app', () => { isQuitting = true; app.quit(); });

ipcMain.on('open-external', (_e, url) => { if (typeof url === 'string') shell.openExternal(url); });

// ---------- OCR ----------
ipcMain.handle('ocr-start', async () => {
  try {
    return await ocr.start({
      cachePath: app.getPath('userData'),
      langPath: tesseractLangPath()
    });
  } catch (err) {
    console.error('[OCR start]', err.message);
    return ocr.getStatus();
  }
});
ipcMain.handle('ocr-stop', () => ocr.stop());
ipcMain.handle('ocr-status', () => ocr.getStatus());
ipcMain.handle('ocr-preview', () => ocr.previewCalibration());
ipcMain.handle('ocr-get-config', () => loadOcrConfig());
ipcMain.handle('ocr-get-settings', () => ocr.getSettings());
ipcMain.handle('ocr-set-settings', (_e, s) => {
  fs.writeFileSync(ocrSettingsFile(), JSON.stringify(s));
  ocr.setSettings(s);
  return ocr.getSettings();
});

ipcMain.handle('ocr-save-config', (_e, rect) => {
  const valid = rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width >= 4 && rect.height >= 4;
  if (!valid) throw new Error('invalid calibration rect');
  const clean = {
    x: Math.round(rect.x), y: Math.round(rect.y),
    width: Math.round(rect.width), height: Math.round(rect.height),
    displayId: rect.displayId ?? null
  };
  fs.writeFileSync(ocrConfigFile(), JSON.stringify(clean));
  ocr.setCalibration(clean);
  if (clean.displayId != null) {
    const s = { ...loadJson(ocrSettingsFile(), {}), displayId: clean.displayId };
    fs.writeFileSync(ocrSettingsFile(), JSON.stringify(s));
    ocr.setSettings(s);
  }
  closeCalibrationWindow();
  return clean;
});

ipcMain.on('ocr-calibrate-cancel', () => closeCalibrationWindow());

let calWin = null;
let calDisplayId = null;

function closeCalibrationWindow() {
  if (calWin && !calWin.isDestroyed()) calWin.close();
  calWin = null;
}

const CALIBRATE_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; cursor:crosshair; }
  body { background:rgba(0,0,0,0.35); height:100vh; overflow:hidden; user-select:none;
         font-family:"Segoe UI",system-ui,sans-serif; }
  #hint { position:fixed; top:24px; left:50%; transform:translateX(-50%);
          background:#151922; color:#F5F7FA; border:1px solid rgba(255,255,255,0.12);
          border-radius:8px; padding:10px 16px; font-size:13px; }
  #hint b { color:#8FA7C4; }
  #rect { position:fixed; border:2px dashed #8FA7C4; background:rgba(143,167,196,0.12); display:none; }
</style></head><body>
  <div id="hint"><b>OCR Calibration</b> — drag over map name · <b>Esc</b> cancel</div>
  <div id="rect"></div>
  <script>
    let sx = 0, sy = 0, dragging = false;
    const r = document.getElementById('rect');
    document.addEventListener('mousedown', (e) => { dragging = true; sx = e.clientX; sy = e.clientY; });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY);
      r.style.display = 'block';
      r.style.left = x + 'px'; r.style.top = y + 'px';
      r.style.width = Math.abs(e.clientX - sx) + 'px';
      r.style.height = Math.abs(e.clientY - sy) + 'px';
    });
    document.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      dragging = false;
      const dpr = window.devicePixelRatio;
      const rect = {
        x: Math.min(sx, e.clientX) * dpr, y: Math.min(sy, e.clientY) * dpr,
        width: Math.abs(e.clientX - sx) * dpr, height: Math.abs(e.clientY - sy) * dpr,
        displayId: ${'DISPLAY_ID_PLACEHOLDER'}
      };
      if (rect.width < 4 || rect.height < 4) { r.style.display = 'none'; return; }
      window.maplebot.saveOCRCalibration(rect).catch(() => {});
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.maplebot.cancelOCRCalibration(); });
  <\/script>
</body></html>`;

ipcMain.on('ocr-calibrate', (_e, displayId) => {
  if (calWin && !calWin.isDestroyed()) { calWin.focus(); return; }
  calDisplayId = displayId ?? screen.getPrimaryDisplay().id;
  const display = screen.getAllDisplays().find((d) => d.id === calDisplayId) || screen.getPrimaryDisplay();
  const html = CALIBRATE_HTML.replace('DISPLAY_ID_PLACEHOLDER', String(calDisplayId));
  calWin = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  calWin.setAlwaysOnTop(true, 'screen-saver');
  calWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  calWin.on('closed', () => { calWin = null; });
});

ipcMain.handle('export-guides', async (_e, payload) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export guides.json',
    defaultPath: 'guides-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return { ok: true, filePath };
});

ipcMain.handle('import-guides', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import guides',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return { ok: false };
  const raw = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  const guides = raw.guides || (Array.isArray(raw) ? raw : [raw]);
  return { ok: true, guides, version: raw.version || '1.0.0' };
});

ipcMain.handle('export-profile', async (_e, profile) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: `${profile.name || 'profile'}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
  return { ok: true };
});

ipcMain.handle('import-profile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return { ok: false };
  return { ok: true, profile: JSON.parse(fs.readFileSync(filePaths[0], 'utf8')) };
});

ipcMain.handle('update-download', async () => {
  const updater = getAutoUpdater();
  if (!updater) return { ok: false };
  await updater.downloadUpdate();
  return { ok: true };
});

ipcMain.handle('update-install', () => {
  const updater = getAutoUpdater();
  if (!updater) return { ok: false };
  isQuitting = true;
  updater.quitAndInstall(false, true);
  return { ok: true };
});

ipcMain.handle('update-check', async () => {
  const updater = getAutoUpdater();
  if (!updater) return { ok: false, reason: 'dev' };
  const result = await updater.checkForUpdates();
  return { ok: true, version: result?.updateInfo?.version ?? null };
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  ocr.stop().catch(() => {});
});
app.on('window-all-closed', () => { /* tray keeps app alive */ });
