// ocr.js — Módulo OCR read-only (F4: captura + reconocimiento; matching en renderer).
// Completamente desacoplado: main.js solo consume la API pública de abajo.
//
// REGLA DURA (CLAUDE.md): display-only. Este módulo SOLO lee píxeles de pantalla
// (desktopCapturer, captura pasiva) y emite texto/confidence hacia el overlay.
// Nunca input injection, memory reading, hooks ni automatización in-game.
// Los frames se procesan 100% en memoria: no se guardan a disco ni salen de la
// máquina (tesseract.js es WASM local; eng.traineddata se cachea en userData).
//
// Costo en reposo = cero: sin OCR activo no hay worker, no hay timers, no hay
// capturas. tesseract.js se require()a lazy dentro de start().

const path = require('path');
const fs = require('fs');
const { desktopCapturer, screen, nativeImage, app } = require('electron');
const { tesseractLangPath } = require('./paths');

const INTERVAL_MS = 3000;    // cadencia de captura (≥3s, fijado en plan F4)
const UPSCALE = 3;           // nearest-neighbor x3 para la fuente bitmap de v83
const THRESHOLD = 170;       // binarización: luminancia ≥ T = glifo (texto claro)
const MIN_CONFIDENCE = 60;   // umbral configurable: debajo → "Unknown Map"

let worker = null;           // worker persistente de tesseract.js — UNA sola creación por start()
let status = 'off';          // 'off' | 'starting' | 'ready'
let statusListener = null;
let resultListener = null;   // push de cada tick hacia main → renderer
let pauseCheck = null;       // () => true → saltar tick (p. ej. overlay colapsado)
let calibration = null;      // rect físico {x,y,width,height} del nombre de mapa
let timer = null;
let ticking = false;         // guard de reentrancia: nunca dos ticks en paralelo
let lastValid = null;        // último resultado con confidence ≥ umbral (interno, no se borra)
let generation = 0;          // invalida un start() en vuelo si llega stop() en medio

const DEV = !app.isPackaged; // logging solo en desarrollo (npm start)

function setStatus(next) {
  status = next;
  if (statusListener) statusListener(status);
}

function setStatusListener(cb) { statusListener = cb; }
function setResultListener(cb) { resultListener = cb; }
function setPauseCheck(fn) { pauseCheck = fn; }
function getStatus() { return status; }

// Rect en píxeles físicos de la pantalla primaria (main lo carga de ocr-config.json)
function setCalibration(rect) {
  calibration = rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width >= 4 && rect.height >= 4 ? rect : null;
}

function emit(payload) {
  if (resultListener) resultListener(payload);
}

// ---------- Pipeline (todo en memoria) ----------

// Captura pasiva de la pantalla primaria a resolución física
async function captureScreen() {
  const display = screen.getPrimaryDisplay();
  const physW = Math.round(display.size.width * display.scaleFactor);
  const physH = Math.round(display.size.height * display.scaleFactor);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: physW, height: physH }
  });
  const src = sources.find((s) => s.display_id === String(display.id)) || sources[0];
  if (!src || src.thumbnail.isEmpty()) throw new Error('captura vacía');
  return { img: src.thumbnail, physW };
}

// crop al rect calibrado → upscale x3 nearest-neighbor → grayscale → threshold binario.
// Devuelve un PNG Buffer (en memoria) listo para tesseract.
function preprocess(img, physW) {
  const size = img.getSize();
  // Si el thumbnail no llegó exactamente a resolución física, escalar el rect proporcionalmente
  const k = size.width / physW;
  const rect = {
    x: Math.max(0, Math.round(calibration.x * k)),
    y: Math.max(0, Math.round(calibration.y * k)),
    width: Math.round(calibration.width * k),
    height: Math.round(calibration.height * k)
  };
  rect.width = Math.min(rect.width, size.width - rect.x);
  rect.height = Math.min(rect.height, size.height - rect.y);
  if (rect.width < 4 || rect.height < 4) throw new Error('rect fuera de pantalla');

  const crop = img.crop(rect);
  const { width, height } = crop.getSize();
  const src = crop.toBitmap(); // BGRA
  const W = width * UPSCALE;
  const H = height * UPSCALE;
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = (y / UPSCALE) | 0;
    for (let x = 0; x < W; x++) {
      const sx = (x / UPSCALE) | 0;
      const si = (sy * width + sx) * 4;
      const lum = 0.114 * src[si] + 0.587 * src[si + 1] + 0.299 * src[si + 2];
      // Texto claro del nombre de mapa → negro sobre blanco (lo que tesseract prefiere)
      const v = lum >= THRESHOLD ? 0 : 255;
      const di = (y * W + x) * 4;
      out[di] = v; out[di + 1] = v; out[di + 2] = v; out[di + 3] = 255;
    }
  }
  return nativeImage.createFromBitmap(out, { width: W, height: H }).toPNG();
}

function normalize(raw) {
  return raw.replace(/\s+/g, ' ').trim();
}

async function tick() {
  if (ticking) return;                       // reentrancia: el tick anterior sigue corriendo
  if (pauseCheck && pauseCheck()) return;    // overlay colapsado → cero capturas
  if (!worker) return;
  if (!calibration) {
    emit({ ok: false, reason: 'uncalibrated' });
    return;
  }
  ticking = true;
  const t0 = Date.now();
  try {
    const { img, physW } = await captureScreen();
    const captureMs = Date.now() - t0;
    const png = preprocess(img, physW);
    const t1 = Date.now();
    const { data } = await worker.recognize(png);
    const ocrMs = Date.now() - t1;
    const raw = (data.text || '').trim();
    const normalized = normalize(raw);
    const confidence = Math.round(data.confidence || 0);
    const ok = normalized.length > 0 && confidence >= MIN_CONFIDENCE;
    if (ok) lastValid = { name: normalized, confidence };
    if (DEV) {
      const total = Date.now() - t0;
      console.log(
        `[OCR] raw="${raw.replace(/\n/g, '⏎')}" | norm="${normalized}" | conf=${confidence}` +
        ` | cap=${captureMs}ms ocr=${ocrMs}ms | fps=${(1000 / Math.max(total, INTERVAL_MS)).toFixed(2)}`
      );
    }
    emit({ ok, normalized, confidence, lastValid });
  } catch (err) {
    // Robustez: nunca lanzar al renderer ni romper el loop; se mantiene el último estado
    if (DEV) console.log('[OCR] tick error:', err.message);
  } finally {
    ticking = false;
  }
}

function startLoop() {
  if (timer) return;
  timer = setInterval(tick, INTERVAL_MS);
  tick(); // primer resultado sin esperar 3s
}

function stopLoop() {
  if (timer) { clearInterval(timer); timer = null; }
}

// ---------- Ciclo de vida ----------

// Inicializa el worker persistente y arranca el loop. Idempotente.
async function start(opts = {}) {
  if (status !== 'off') return status;
  const myGen = ++generation;
  setStatus('starting');
  try {
    // Lazy require: si OCR nunca se activa, tesseract.js jamás se carga en memoria
    const { createWorker } = require('tesseract.js');
    const langPath = opts.langPath || tesseractLangPath();
    const workerOpts = { cachePath: opts.cachePath || app.getPath('userData') };
    if (fs.existsSync(path.join(langPath, 'eng.traineddata'))) {
      workerOpts.langPath = langPath;
    }
    const w = await createWorker('eng', 1, workerOpts);
    // Fuente bitmap de v83: una sola línea, charset restringido
    await w.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :'-",
      tessedit_pageseg_mode: '7' // PSM.SINGLE_LINE
    });
    if (myGen !== generation) {
      await w.terminate().catch(() => {}); // stop() llegó en medio: descartar
      return status;
    }
    worker = w;
    setStatus('ready');
    startLoop();
  } catch (err) {
    if (myGen === generation) {
      worker = null;
      setStatus('off');
    }
    throw err;
  }
  return status;
}

// Detiene loop y worker. Seguro en cualquier estado (incluido will-quit).
async function stop() {
  generation++;
  stopLoop();
  const w = worker;
  worker = null;
  ticking = false;
  if (status !== 'off') setStatus('off');
  if (w) await w.terminate().catch(() => {});
  return status;
}

/* ============================================================================
 * F4.3 — matching + auto-highlight: implementado en renderer/app.js (ahí viven
 * las guías). Este módulo solo emite {ok, normalized, confidence, lastValid};
 * el renderer normaliza (aliases + fuzzy) y pinta el 📍. `lastValid` no se
 * borra ante confidence baja: es el insumo del matching. NUNCA auto-check.
 * ========================================================================== */

module.exports = {
  start, stop, getStatus,
  setStatusListener, setResultListener, setPauseCheck, setCalibration
};
