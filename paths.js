const path = require('path');
const { app } = require('electron');

function appRoot() {
  return app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked') : __dirname;
}

function dataPath(...parts) {
  return path.join(__dirname, 'data', ...parts);
}

function tesseractLangPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'tesseract');
  }
  return path.join(__dirname, 'resources', 'tesseract');
}

module.exports = { appRoot, dataPath, tesseractLangPath };
