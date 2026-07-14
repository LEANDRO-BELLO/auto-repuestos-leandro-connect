const path = require('path');
const { app, BrowserWindow } = require('electron');
const { initializeDatabase } = require('../database/init-db');
const { closeDatabase } = require('../database/connection');
const { registerIpcHandlers } = require('./ipc');
const { registerDocumentHandlers } = require('./document');
const { registerEtiquetaHandlers } = require('./etiqueta');
const { createMainWindow } = require('./window');
const logger = require('../utils/logger');

if (!app.isPackaged) {
  app.setPath('userData', path.join(__dirname, '../../.electron-user-data'));
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

let mainWindow = null;

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

async function bootstrap() {
  try {
    await initializeDatabase();
    registerIpcHandlers();
    registerDocumentHandlers();
    try {
      registerEtiquetaHandlers(require('electron').ipcMain);
    } catch (error) {
      logger.error('Etiqueta QR desactivada temporalmente', error);
    }
    mainWindow = createMainWindow();
    logger.info('Aplicación iniciada correctamente.');
  } catch (error) {
    logger.error('Error al iniciar la aplicación', error);
    app.quit();
  }
}

if (gotSingleInstanceLock) {
  app.whenReady().then(bootstrap);

  app.on('second-instance', () => {
    focusMainWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    } else {
      focusMainWindow();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  try {
    await closeDatabase();
  } catch (error) {
    logger.error('Error al cerrar la base de datos', error);
  }
});
