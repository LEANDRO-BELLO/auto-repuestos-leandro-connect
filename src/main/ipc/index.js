const { ipcMain } = require('electron');
const { authService, empresaService } = require('../../services');
const logger = require('../../utils/logger');

function registerIpcHandlers() {
  ipcMain.handle('auth:login', async (_event, credentials) => {
    try {
      return await authService.login(credentials);
    } catch (error) {
      logger.error('Error en auth:login', error);
      return { ok: false, error: 'No se pudo iniciar sesión. Intente nuevamente.' };
    }
  });

  ipcMain.handle('empresa:get', async () => {
    try {
      return await empresaService.getEmpresa();
    } catch (error) {
      logger.error('Error en empresa:get', error);
      return null;
    }
  });

  ipcMain.handle('app:getVersion', () => {
    const { app } = require('electron');
    return app.getVersion();
  });
}

module.exports = { registerIpcHandlers };
