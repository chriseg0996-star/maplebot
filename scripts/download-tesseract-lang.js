// Downloads eng.traineddata for offline OCR (run via postinstall or manually).
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT_DIR = path.join(__dirname, '..', 'resources', 'tesseract');
const OUT_FILE = path.join(OUT_DIR, 'eng.traineddata');
const URL = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata';

if (fs.existsSync(OUT_FILE) && fs.statSync(OUT_FILE).size > 1000000) {
  console.log('[tesseract] eng.traineddata already present');
  process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
console.log('[tesseract] Downloading eng.traineddata...');

const file = fs.createWriteStream(OUT_FILE);
https.get(URL, (res) => {
  if (res.statusCode === 302 || res.statusCode === 301) {
    https.get(res.headers.location, (r) => r.pipe(file));
    return;
  }
  if (res.statusCode !== 200) {
    console.error('[tesseract] Download failed:', res.statusCode);
    process.exit(1);
  }
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('[tesseract] Saved to', OUT_FILE);
  });
}).on('error', (err) => {
  fs.unlink(OUT_FILE, () => {});
  console.error('[tesseract]', err.message);
  process.exit(1);
});
