const path = require('path');

function getElectronApp() {
  try {
    const electron = require('electron');
    if (electron && typeof electron === 'object' && electron.app) {
      return electron.app;
    }
    return null;
  } catch {
    return null;
  }
}

function isPackagedApp() {
  const app = getElectronApp();
  return Boolean(app?.isPackaged);
}

function getProjectRoot() {
  return path.join(__dirname, '../..');
}

function getDataDir() {
  const app = getElectronApp();

  if (!app || !app.isPackaged) {
    return path.join(getProjectRoot(), 'data');
  }

  return path.join(app.getPath('userData'), 'data');
}

function getDbPath() {
  return path.join(getDataDir(), 'auto_repuestos_leandro.db');
}

function getRendererPath(...segments) {
  return path.join(__dirname, '../renderer', ...segments);
}

module.exports = {
  isPackagedApp,
  getProjectRoot,
  getDataDir,
  getDbPath,
  getRendererPath
};
