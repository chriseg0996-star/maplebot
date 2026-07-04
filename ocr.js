// OCR module — read-only screen capture + tesseract (display-only).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { desktopCapturer, screen, nativeImage, app } = require('electron');
const { tesseractLangPath } = require('./paths');

const DEFAULTS = { minConfidence: 45, intervalMs: 3000, displayId: null, fastTick: false };
const UPSCALE = 4;
const THRESHOLD = 128;

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
  const id = settings.displayId ?? calibration?.displayId ?? null;
  if (id != null) {
    const found = screen.getAllDisplays().find((d) => d.id === id);
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

function preprocess(img, physW, { threshold = THRESHOLD, invert = false } = {}) {
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
      const dark = lum >= threshold ? 0 : 255;
      const v = invert ? (255 - dark) : dark;
      const di = (y * W + x) * 4;
      out[di] = v; out[di + 1] = v; out[di + 2] = v; out[di + 3] = 255;
    }
  }
  const png = nativeImage.createFromBitmap(out, { width: W, height: H }).toPNG();
  const hash = crypto.createHash('md5').update(png).digest('hex');
  return { png, hash };
}

function readConfidence(data) {
  const words = (data.words || []).filter((w) => (w.text || '').trim());
  if (words.length) {
    return Math.round(words.reduce((s, w) => s + (w.confidence || 0), 0) / words.length);
  }
  return Math.round(data.confidence || 0);
}

async function recognizeCrop(png) {
  const { data } = await worker.recognize(png);
  const normalized = normalize((data.text || '').trim());
  const confidence = readConfidence(data);
  return { normalized, confidence };
}

function normalize(raw) {
  return raw.replace(/\s+/g, ' ').trim();
}

function looksLikeMapName(s) {
  if (!s || s.length < 3 || s.length > 52) return false;
  if (s.split(/\s+/).length > 8) return false;
  const alpha = (s.match(/[A-Za-z]/g) || []).length;
  if (alpha / s.length < 0.45) return false;
  return true;
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
      if (lastValid) emit({ ok: true, normalized: lastValid.name, confidence: lastValid.confidence, lastValid, skipped: true });
      else emit({ ok: false, skipped: true, reason: 'unchanged', lastValid });
      return;
    }
    lastCropHash = hash;
    let { normalized, confidence } = await recognizeCrop(png);
    const minConf = settings.minConfidence ?? DEFAULTS.minConfidence;
    const softMin = Math.min(minConf, 28);
    let ok = normalized.length >= 2 && confidence >= minConf;
    if (!ok && normalized.length >= 3) {
      const alt = preprocess(img, physW, { threshold: 100, invert: true });
      const retry = await recognizeCrop(alt.png);
      if (retry.normalized.length >= 2 && retry.confidence >= softMin &&
          retry.confidence >= confidence) {
        normalized = retry.normalized;
        confidence = retry.confidence;
        ok = confidence >= minConf || (confidence >= softMin && /^[A-Za-z][A-Za-z0-9' :\-]+$/.test(normalized));
      }
    }
    if (!ok && normalized.length >= 3 && confidence >= softMin &&
        /^[A-Za-z][A-Za-z0-9' :\-]+$/.test(normalized) && looksLikeMapName(normalized)) {
      ok = true;
    }
    if (ok && !looksLikeMapName(normalized)) ok = false;
    if (!ok && lastValid && normalized && !looksLikeMapName(normalized)) {
      emit({ ok: true, normalized: lastValid.name, confidence: lastValid.confidence, lastValid, skipped: true, reason: 'rejected_garbage' });
      return;
    }
    if (ok) lastValid = { name: normalized, confidence };
    if (DEV) console.log(`[OCR] "${normalized}" conf=${confidence} ok=${ok}`);
    emit({
      ok,
      normalized,
      confidence,
      lastValid,
      minConfidence: minConf,
      reason: !normalized.length ? 'no_text' : undefined
    });
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

function seedTesseractCache(cachePath, langPath) {
  const dest = path.join(cachePath, 'eng.traineddata');
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) return true;
  const src = path.join(langPath, 'eng.traineddata');
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(cachePath, { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

async function start(opts = {}) {
  if (status !== 'off') return status;
  const myGen = ++generation;
  setStatus('starting');
  try {
    const { createWorker } = require('tesseract.js');
    const langPath = opts.langPath || tesseractLangPath();
    const cachePath = opts.cachePath || app.getPath('userData');
    const workerOpts = { cachePath };
    // Copy bundled eng.traineddata into userData so tesseract.js reads from cache
    // (local langPath expects .traineddata.gz; our bundle is uncompressed).
    if (!seedTesseractCache(cachePath, langPath)) {
      if (fs.existsSync(path.join(langPath, 'eng.traineddata.gz'))) {
        workerOpts.langPath = langPath;
        workerOpts.gzip = true;
      } else if (fs.existsSync(path.join(langPath, 'eng.traineddata'))) {
        workerOpts.langPath = langPath;
        workerOpts.gzip = false;
      }
    }
    const w = await createWorker('eng', 1, workerOpts);
    await w.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :'-",
      tessedit_pageseg_mode: '6'
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

async function previewCalibration() {
  if (!calibration) return { ok: false, reason: 'uncalibrated' };
  try {
    const { img, physW } = await captureScreen();
    const { png } = preprocess(img, physW);
    let text = '';
    let confidence = 0;
    if (worker) {
      const r = await recognizeCrop(png);
      text = r.normalized;
      confidence = r.confidence;
    }
    return {
      ok: true,
      image: `data:image/png;base64,${png.toString('base64')}`,
      text,
      confidence
    };
  } catch (err) {
    return { ok: false, reason: 'error', message: err.message };
  }
}

module.exports = {
  start, stop, getStatus, getSettings, setSettings,
  setStatusListener, setResultListener, setPauseCheck, setCalibration,
  previewCalibration
};
