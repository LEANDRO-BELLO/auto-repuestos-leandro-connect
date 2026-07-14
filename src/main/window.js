const path = require('path');
const { BrowserWindow } = require('electron');
const logger = require('../utils/logger');

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: true,
    center: true,
    autoHideMenuBar: true,
    backgroundColor: '#0f1419',
    title: 'Auto Repuestos Leandro Connect',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  let revealed = false;

  const revealWindow = (reason) => {
    if (revealed || window.isDestroyed()) {
      return;
    }

    revealed = true;
    window.show();
    window.center();
    window.focus();

    if (reason) {
      logger.info(`Ventana principal visible (${reason}).`);
    }
  };

  window.once('ready-to-show', () => revealWindow('ready-to-show'));

  window.webContents.once('did-finish-load', () => revealWindow('did-finish-load'));

  window.webContents.on('did-fail-load', (_event, code, description, url) => {
    logger.error(`Error al cargar la ventana (${code}): ${description} — ${url}`);
    revealWindow('did-fail-load');
  });

  setTimeout(() => revealWindow('timeout'), 4000);

  window.loadFile(path.join(__dirname, '../renderer/index.html'));

  return window;
}

module.exports = { createMainWindow };
