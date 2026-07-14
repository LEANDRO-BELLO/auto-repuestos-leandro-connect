const { ipcMain } = require('electron');
const { authService, empresaService, clientesService, vehiculosService, ordenesService, serviciosRealizadosService, proximosServiciosService, configEtiquetaService } = require('../../services');
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

  ipcMain.handle('app:getDevBootstrap', () => ({
    autoLogin: process.env.ARL_DEV_AUTO === '1',
    startupPage: process.env.ARL_STARTUP_PAGE || 'inicio'
  }));

  ipcMain.handle('app:openExternal', async (_event, url) => {
    try {
      const { shell } = require('electron');

      if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return { ok: false, error: 'URL inválida.' };
      }

      await shell.openExternal(url);
      return { ok: true };
    } catch (error) {
      logger.error('Error en app:openExternal', error);
      return { ok: false, error: 'No se pudo abrir el enlace.' };
    }
  });

  ipcMain.handle('clientes:list', async (_event, search) => {
    try {
      return await clientesService.listClientes(search);
    } catch (error) {
      logger.error('Error en clientes:list', error);
      return [];
    }
  });

  ipcMain.handle('clientes:get', async (_event, id) => {
    try {
      return await clientesService.getCliente(id);
    } catch (error) {
      logger.error('Error en clientes:get', error);
      return null;
    }
  });

  ipcMain.handle('clientes:create', async (_event, data) => {
    try {
      return await clientesService.createCliente(data);
    } catch (error) {
      logger.error('Error en clientes:create', error);
      return { ok: false, error: 'No se pudo crear el cliente.' };
    }
  });

  ipcMain.handle('clientes:update', async (_event, id, data) => {
    try {
      return await clientesService.updateCliente(id, data);
    } catch (error) {
      logger.error('Error en clientes:update', error);
      return { ok: false, error: 'No se pudo actualizar el cliente.' };
    }
  });

  ipcMain.handle('clientes:delete', async (_event, id) => {
    try {
      return await clientesService.deleteCliente(id);
    } catch (error) {
      logger.error('Error en clientes:delete', error);
      return { ok: false, error: 'No se pudo eliminar el cliente.' };
    }
  });

  ipcMain.handle('vehiculos:list', async (_event, search) => {
    try {
      return await vehiculosService.listVehiculos(search);
    } catch (error) {
      logger.error('Error en vehiculos:list', error);
      return [];
    }
  });

  ipcMain.handle('vehiculos:get', async (_event, id) => {
    try {
      return await vehiculosService.getVehiculo(id);
    } catch (error) {
      logger.error('Error en vehiculos:get', error);
      return null;
    }
  });
  ipcMain.handle('vehiculos:getByQrCode', async (_event, qrCode) => {
    try {
      return await vehiculosService.getVehiculoByQrCode(qrCode);
    } catch (error) {
      logger.error('Error en vehiculos:getByQrCode', error);
      return null;
    }
  });
  ipcMain.handle('vehiculos:create', async (_event, data) => {
    try {
      return await vehiculosService.createVehiculo(data);
    } catch (error) {
      logger.error('Error en vehiculos:create', error);
      return { ok: false, error: 'No se pudo crear el vehículo.' };
    }
  });

  ipcMain.handle('vehiculos:update', async (_event, id, data) => {
    try {
      return await vehiculosService.updateVehiculo(id, data);
    } catch (error) {
      logger.error('Error en vehiculos:update', error);
      return { ok: false, error: 'No se pudo actualizar el vehículo.' };
    }
  });

  ipcMain.handle('vehiculos:delete', async (_event, id) => {
    try {
      return await vehiculosService.deleteVehiculo(id);
    } catch (error) {
      logger.error('Error en vehiculos:delete', error);
      return { ok: false, error: 'No se pudo eliminar el vehículo.' };
    }
  });

  ipcMain.handle('ordenes:list', async (_event, search) => {
    try {
      return await ordenesService.listOrdenes(search);
    } catch (error) {
      logger.error('Error en ordenes:list', error);
      return [];
    }
  });

  ipcMain.handle('ordenes:get', async (_event, id) => {
    try {
      return await ordenesService.getOrden(id);
    } catch (error) {
      logger.error('Error en ordenes:get', error);
      return null;
    }
  });

  ipcMain.handle('ordenes:create', async (_event, data) => {
    try {
      return await ordenesService.createOrden(data);
    } catch (error) {
      logger.error('Error en ordenes:create', error);
      return { ok: false, error: 'No se pudo crear la orden.' };
    }
  });

  ipcMain.handle('ordenes:update', async (_event, id, data) => {
    try {
      return await ordenesService.updateOrden(id, data);
    } catch (error) {
      logger.error('Error en ordenes:update', error);
      return { ok: false, error: 'No se pudo actualizar la orden.' };
    }
  });

  ipcMain.handle('ordenes:delete', async (_event, id) => {
    try {
      return await ordenesService.deleteOrden(id);
    } catch (error) {
      logger.error('Error en ordenes:delete', error);
      return { ok: false, error: 'No se pudo eliminar la orden.' };
    }
  });

  ipcMain.handle('ordenes:listVehiculosByCliente', async (_event, clienteId) => {
    try {
      return await ordenesService.listVehiculosByCliente(clienteId);
    } catch (error) {
      logger.error('Error en ordenes:listVehiculosByCliente', error);
      return [];
    }
  });

  ipcMain.handle('ordenes:searchVehiculos', async (_event, search) => {
    try {
      return await ordenesService.searchVehiculosForOrden(search);
    } catch (error) {
      logger.error('Error en ordenes:searchVehiculos', error);
      return [];
    }
  });

  ipcMain.handle('serviciosRealizados:list', async (_event, filters) => {
    try {
      return await serviciosRealizadosService.listServiciosRealizados(filters);
    } catch (error) {
      logger.error('Error en serviciosRealizados:list', error);
      return { items: [], totalFinalizadas: 0 };
    }
  });

  ipcMain.handle('proximosServicios:list', async (_event, filters) => {
    try {
      return await proximosServiciosService.listProximosServicios(filters);
    } catch (error) {
      logger.error('Error en proximosServicios:list', error);
      return { items: [], total: 0 };
    }
  });

  ipcMain.handle('configEtiqueta:get', async () => {
    try {
      return await configEtiquetaService.getConfigEtiqueta();
    } catch (error) {
      logger.error('Error en configEtiqueta:get', error);
      return null;
    }
  });

  ipcMain.handle('configEtiqueta:update', async (_event, data) => {
    try {
      return await configEtiquetaService.updateConfigEtiqueta(data);
    } catch (error) {
      logger.error('Error en configEtiqueta:update', error);
      return { ok: false, error: 'No se pudo guardar la configuración.' };
    }
  });
}

module.exports = { registerIpcHandlers };
