const path = require('path');
const { BrowserWindow } = require('electron');

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: 'Auto Repuestos Leandro Connect',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.loadFile(path.join(__dirname, '../renderer/index.html'));

  window.once('ready-to-show', () => {
    window.show();
  });

  return window;
}

module.exports = { createMainWindow };
