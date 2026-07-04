const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('maplebot', {
  getGuides: () => ipcRenderer.invoke('get-guides'),
  getDatabase: () => ipcRenderer.invoke('get-database'),
  setOpacity: (v) => ipcRenderer.send('set-opacity', v),
  toggleLock: () => ipcRenderer.send('toggle-lock'),
  setCollapsed: (collapsed, height) => ipcRenderer.send('set-collapsed', collapsed, height),
  quit: () => ipcRenderer.send('quit-app'),
  onLockChanged: (cb) => ipcRenderer.on('lock-changed', (_e, locked) => cb(locked)),
  // OCR (F4.2 — captura pasiva + reconocimiento, display-only)
  startOCR: () => ipcRenderer.invoke('ocr-start'),
  stopOCR: () => ipcRenderer.invoke('ocr-stop'),
  getOCRStatus: () => ipcRenderer.invoke('ocr-status'),
  onOCRStatusChanged: (cb) => ipcRenderer.on('ocr-status-changed', (_e, s) => cb(s)),
  onOCRResult: (cb) => ipcRenderer.on('ocr-result', (_e, r) => cb(r)),
  getOCRConfig: () => ipcRenderer.invoke('ocr-get-config'),
  calibrateOCR: () => ipcRenderer.send('ocr-calibrate'),
  // usadas por la página de calibración (misma preload)
  exportGuides: (payload) => ipcRenderer.invoke('export-guides', payload),
  importGuides: () => ipcRenderer.invoke('import-guides'),
  saveOCRCalibration: (rect) => ipcRenderer.invoke('ocr-save-config', rect),
  cancelOCRCalibration: () => ipcRenderer.send('ocr-calibrate-cancel')
});
