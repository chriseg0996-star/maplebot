const { app, BrowserWindow, ipcMain, globalShortcut, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ocr = require('./ocr');
const { tesseractLangPath } = require('./paths');

let win = null;
let clickThrough = false;
let expandedHeight = null; // altura previa al collapse

const DEFAULT_BOUNDS = { width: 340, height: 520 };
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

// ---------- Window state (posición/tamaño) ----------
function loadWindowState() {
  try {
    const saved = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (typeof saved.width !== 'number' || typeof saved.height !== 'number') return DEFAULT_BOUNDS;
    // No restaurar fuera de pantalla (monitor desconectado, etc.)
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
let loadedBounds = null; // bounds aplicados al crear la ventana (anti size-creep)
function saveWindowState() {
  if (!win || win.isDestroyed()) return;
  // Guardar siempre la altura expandida, no la colapsada
  const bounds = win.getBounds();
  if (expandedHeight !== null) bounds.height = expandedHeight;
  // Anti-creep: en Windows con DPI fraccional, getBounds() deriva ±1-2px por sesión
  // en ventanas transparent/frameless. Deltas pequeños = ruido del OS, no intención del usuario.
  if (loadedBounds) {
    for (const k of ['x', 'y', 'width', 'height']) {
      if (typeof loadedBounds[k] === 'number' && Math.abs(bounds[k] - loadedBounds[k]) <= 8) {
        bounds[k] = loadedBounds[k];
      }
    }
  }
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(bounds));
    loadedBounds = bounds; // el nuevo baseline: futuros deltas pequeños se snapean a esto
  } catch (_) { /* disco no disponible → se pierde la posición, no es fatal */ }
}
function saveWindowStateDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveWindowState, 500);
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

  // Nivel screen-saver: se mantiene sobre juegos en borderless windowed
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('moved', saveWindowStateDebounced);
  win.on('resized', saveWindowStateDebounced);
  win.on('close', () => {
    clearTimeout(saveTimer);
    saveWindowState();
  });
}

app.whenReady().then(() => {
  createWindow();

  // Push de estado OCR hacia el overlay (off | starting | ready)
  ocr.setStatusListener((s) => {
    if (win && !win.isDestroyed()) win.webContents.send('ocr-status-changed', s);
  });
  // Push de cada resultado de reconocimiento (F4.2)
  ocr.setResultListener((r) => {
    if (win && !win.isDestroyed()) win.webContents.send('ocr-result', r);
  });
  // Overlay colapsado → cero capturas (expandedHeight solo es no-null durante collapse)
  ocr.setPauseCheck(() => expandedHeight !== null);
  // Calibración previa, si existe
  ocr.setCalibration(loadOcrConfig());

  // F8 global: toggle click-through aunque el juego tenga el foco
  globalShortcut.register('F8', () => {
    if (!win || win.isDestroyed()) return;
    clickThrough = !clickThrough;
    win.setIgnoreMouseEvents(clickThrough, { forward: true });
    win.webContents.send('lock-changed', clickThrough);
  });
});

// ---------- IPC ----------
ipcMain.handle('get-guides', () => {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'guides.json'), 'utf8');
  return JSON.parse(raw);
});

// Companion Database (F5) — un envelope por tipo; archivo faltante/corrupto → null (el renderer tolera parcial)
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

ipcMain.on('set-opacity', (_e, value) => {
  if (!win || win.isDestroyed()) return;
  win.setOpacity(Math.min(1, Math.max(0.3, value)));
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
    // setSize antes de setResizable(false): en Windows setSize es no-op sobre ventana no redimensionable
    win.setSize(width, Math.max(24, Math.round(collapsedHeight)));
    win.setResizable(false);
  } else {
    win.setResizable(true);
    win.setSize(width, expandedHeight || DEFAULT_BOUNDS.height);
    expandedHeight = null;
  }
});

// ---------- OCR (F4.2 — captura pasiva + reconocimiento) ----------
const ocrConfigFile = () => path.join(app.getPath('userData'), 'ocr-config.json');

function loadOcrConfig() {
  try {
    return JSON.parse(fs.readFileSync(ocrConfigFile(), 'utf8'));
  } catch (_) {
    return null; // sin calibrar todavía
  }
}

ipcMain.handle('ocr-start', () => ocr.start({
  cachePath: app.getPath('userData'),
  langPath: tesseractLangPath()
}));
ipcMain.handle('ocr-stop', () => ocr.stop());
ipcMain.handle('ocr-status', () => ocr.getStatus());
ipcMain.handle('ocr-get-config', () => loadOcrConfig());

ipcMain.handle('ocr-save-config', (_e, rect) => {
  const valid = rect &&
    [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width >= 4 && rect.height >= 4;
  if (!valid) throw new Error('rect de calibración inválido');
  const clean = {
    x: Math.round(rect.x), y: Math.round(rect.y),
    width: Math.round(rect.width), height: Math.round(rect.height)
  };
  fs.writeFileSync(ocrConfigFile(), JSON.stringify(clean));
  ocr.setCalibration(clean);
  closeCalibrationWindow();
  return clean;
});

ipcMain.on('ocr-calibrate-cancel', () => closeCalibrationWindow());

// Ventana fullscreen transparente para dibujar el rect del nombre de mapa.
// Página inline (data: URL) — usa el mismo preload para llegar a ocr-save-config.
let calWin = null;

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
  <div id="hint"><b>Calibración OCR</b> — arrastra un rectángulo sobre el nombre del mapa · <b>Esc</b> cancela</div>
  <div id="rect"></div>
  <script>
    let sx = 0, sy = 0, dragging = false;
    const r = document.getElementById('rect');
    document.addEventListener('mousedown', (e) => { dragging = true; sx = e.clientX; sy = e.clientY; });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const x = Math.min(sx, e.clientX), y = Math.min(sy, e.clientY);
      const w = Math.abs(e.clientX - sx), h = Math.abs(e.clientY - sy);
      r.style.display = 'block';
      r.style.left = x + 'px'; r.style.top = y + 'px';
      r.style.width = w + 'px'; r.style.height = h + 'px';
    });
    document.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      dragging = false;
      const dpr = window.devicePixelRatio; // rect en píxeles físicos de pantalla
      const rect = {
        x: Math.min(sx, e.clientX) * dpr, y: Math.min(sy, e.clientY) * dpr,
        width: Math.abs(e.clientX - sx) * dpr, height: Math.abs(e.clientY - sy) * dpr
      };
      if (rect.width < 4 || rect.height < 4) { r.style.display = 'none'; return; }
      window.maplebot.saveOCRCalibration(rect).catch(() => {});
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.maplebot.cancelOCRCalibration(); });
  <\/script>
</body></html>`;

ipcMain.on('ocr-calibrate', () => {
  if (calWin && !calWin.isDestroyed()) { calWin.focus(); return; }
  const display = screen.getPrimaryDisplay();
  calWin = new BrowserWindow({
    ...display.bounds,
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
  calWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(CALIBRATE_HTML));
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

ipcMain.on('quit-app', () => app.quit());

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  ocr.stop().catch(() => {}); // destruye el worker si quedó vivo
});
app.on('window-all-closed', () => app.quit());
