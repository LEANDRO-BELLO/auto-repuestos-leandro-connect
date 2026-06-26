const { app, BrowserWindow } = require('electron');
const { initializeDatabase } = require('../database/init-db');
const { closeDatabase } = require('../database/connection');
const { registerIpcHandlers } = require('./ipc');
const { createMainWindow } = require('./window');
const logger = require('../utils/logger');

let mainWindow = null;

async function bootstrap() {
  try {
    await initializeDatabase();
    registerIpcHandlers();
    mainWindow = createMainWindow();
    logger.info('Aplicación iniciada correctamente.');
  } catch (error) {
    logger.error('Error al iniciar la aplicación', error);
    app.quit();
  }
}

app.whenReady().then(bootstrap);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});

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
