// OCR module — read-only screen capture + tesseract (display-only).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { desktopCapturer, screen, nativeImage, app } = require('electron');
const { tesseractLangPath } = require('./paths');

const DEFAULTS = { minConfidence: 60, intervalMs: 3000, displayId: null, fastTick: false };
const UPSCALE = 3;
const THRESHOLD = 170;

let worker = null;
let status = 'off';
let statusListener = null;
let resultListener = null;
let pauseCheck = null;
let calibration = null;
let timer = null;
let ticking = false;
let lastValid = null;
let generation = 0;
let settings = { ...DEFAULTS };
let lastCropHash = null;

const DEV = !app.isPackaged;

function setStatus(next) {
  status = next;
  if (statusListener) statusListener(status);
}

function setStatusListener(cb) { statusListener = cb; }
function setResultListener(cb) { resultListener = cb; }
function setPauseCheck(fn) { pauseCheck = fn; }
function getStatus() { return status; }

function setCalibration(rect) {
  calibration = rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width >= 4 && rect.height >= 4 ? rect : null;
  lastCropHash = null;
}

function setSettings(s) {
  settings = { ...DEFAULTS, ...s };
  if (status === 'ready') {
    stopLoop();
    startLoop();
  }
}

function getSettings() { return { ...settings }; }

function getTargetDisplay() {
  if (settings.displayId != null) {
    const found = screen.getAllDisplays().find((d) => d.id === settings.displayId);
    if (found) return found;
  }
  return screen.getPrimaryDisplay();
}

function emit(payload) {
  if (resultListener) resultListener(payload);
}

async function captureScreen() {
  const display = getTargetDisplay();
  const physW = Math.round(display.size.width * display.scaleFactor);
  const physH = Math.round(display.size.height * display.scaleFactor);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: physW, height: physH }
  });
  const src = sources.find((s) => s.display_id === String(display.id)) || sources[0];
  if (!src || src.thumbnail.isEmpty()) throw new Error('empty capture');
  return { img: src.thumbnail, physW };
}

function preprocess(img, physW) {
  const size = img.getSize();
  const k = size.width / physW;
  const rect = {
    x: Math.max(0, Math.round(calibration.x * k)),
    y: Math.max(0, Math.round(calibration.y * k)),
    width: Math.round(calibration.width * k),
    height: Math.round(calibration.height * k)
  };
  rect.width = Math.min(rect.width, size.width - rect.x);
  rect.height = Math.min(rect.height, size.height - rect.y);
  if (rect.width < 4 || rect.height < 4) throw new Error('rect out of bounds');

  const crop = img.crop(rect);
  const { width, height } = crop.getSize();
  const src = crop.toBitmap();
  const W = width * UPSCALE;
  const H = height * UPSCALE;
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = (y / UPSCALE) | 0;
    for (let x = 0; x < W; x++) {
      const sx = (x / UPSCALE) | 0;
      const si = (sy * width + sx) * 4;
      const lum = 0.114 * src[si] + 0.587 * src[si + 1] + 0.299 * src[si + 2];
      const v = lum >= THRESHOLD ? 0 : 255;
      const di = (y * W + x) * 4;
      out[di] = v; out[di + 1] = v; out[di + 2] = v; out[di + 3] = 255;
    }
  }
  const png = nativeImage.createFromBitmap(out, { width: W, height: H }).toPNG();
  const hash = crypto.createHash('md5').update(png).digest('hex');
  return { png, hash };
}

function normalize(raw) {
  return raw.replace(/\s+/g, ' ').trim();
}

async function tick() {
  if (ticking) return;
  if (pauseCheck && pauseCheck()) return;
  if (!worker) return;
  if (!calibration) {
    emit({ ok: false, reason: 'uncalibrated' });
    return;
  }
  ticking = true;
  try {
    const { img, physW } = await captureScreen();
    const { png, hash } = preprocess(img, physW);
    if (hash === lastCropHash) {
      emit({ ok: false, skipped: true, lastValid, reason: 'unchanged' });
      return;
    }
    lastCropHash = hash;
    const { data } = await worker.recognize(png);
    const normalized = normalize((data.text || '').trim());
    const confidence = Math.round(data.confidence || 0);
    const minConf = settings.minConfidence ?? DEFAULTS.minConfidence;
    const ok = normalized.length > 0 && confidence >= minConf;
    if (ok) lastValid = { name: normalized, confidence };
    if (DEV) console.log(`[OCR] "${normalized}" conf=${confidence}`);
    emit({ ok, normalized, confidence, lastValid, minConfidence: minConf });
  } catch (err) {
    if (DEV) console.log('[OCR] error:', err.message);
    emit({ ok: false, reason: 'error', message: err.message, lastValid });
  } finally {
    ticking = false;
  }
}

function intervalMs() {
  return settings.fastTick ? 2000 : (settings.intervalMs || DEFAULTS.intervalMs);
}

function startLoop() {
  if (timer) clearInterval(timer);
  timer = setInterval(tick, intervalMs());
  tick();
}

function stopLoop() {
  if (timer) { clearInterval(timer); timer = null; }
}

async function start(opts = {}) {
  if (status !== 'off') return status;
  const myGen = ++generation;
  setStatus('starting');
  try {
    const { createWorker } = require('tesseract.js');
    const langPath = opts.langPath || tesseractLangPath();
    const workerOpts = { cachePath: opts.cachePath || app.getPath('userData') };
    if (fs.existsSync(path.join(langPath, 'eng.traineddata'))) workerOpts.langPath = langPath;
    const w = await createWorker('eng', 1, workerOpts);
    await w.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :'-",
      tessedit_pageseg_mode: '7'
    });
    if (myGen !== generation) {
      await w.terminate().catch(() => {});
      return status;
    }
    worker = w;
    setStatus('ready');
    startLoop();
  } catch (err) {
    if (myGen === generation) { worker = null; setStatus('off'); }
    throw err;
  }
  return status;
}

async function stop() {
  generation++;
  stopLoop();
  const w = worker;
  worker = null;
  ticking = false;
  lastCropHash = null;
  if (status !== 'off') setStatus('off');
  if (w) await w.terminate().catch(() => {});
  return status;
}

module.exports = {
  start, stop, getStatus, getSettings, setSettings,
  setStatusListener, setResultListener, setPauseCheck, setCalibration
};
