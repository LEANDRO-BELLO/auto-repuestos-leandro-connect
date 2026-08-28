const { ipcMain } = require('electron');
const { authService, empresaService, clientesService, vehiculosService, ordenesService, serviciosRealizadosService, proximosServiciosService, configEtiquetaService, agendamientosService, dashboardService, usuariosService } = require('../../services');
const logger = require('../../utils/logger');

let currentSession = null;

function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    nombre: user.nombre,
    usuario: user.usuario,
    perfil: user.perfil,
    whatsapp: user.whatsapp || '',
    activo: user.activo
  };
}

function requireAdmin() {
  if (!currentSession) {
    return { ok: false, error: 'Debe iniciar sesión.' };
  }

  if (currentSession.perfil !== 'Administrador') {
    return { ok: false, error: 'No autorizado.' };
  }

  return null;
}

function registerIpcHandlers() {
  ipcMain.handle('auth:login', async (_event, credentials) => {
    try {
      const result = await authService.login(credentials);

      if (result.ok) {
        currentSession = publicUser(result.user);
        return { ok: true, user: currentSession };
      }

      currentSession = null;
      return result;
    } catch (error) {
      logger.error('Error en auth:login', error);
      currentSession = null;
      return { ok: false, error: 'No se pudo iniciar sesión. Intente nuevamente.' };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    currentSession = null;
    return { ok: true };
  });

  ipcMain.handle('auth:currentUser', async () => publicUser(currentSession));

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



  ipcMain.handle('dashboard:get', async () => {
    const t0 = performance.now();
    console.log('[PERF] ipc.dashboard:get start');
    try {
      const result = await dashboardService.getDashboard();
      console.log(`[PERF] ipc.dashboard:get ${Math.round(performance.now() - t0)}ms`);
      return result;
    } catch (error) {
      console.log(`[PERF] ipc.dashboard:get FAIL ${Math.round(performance.now() - t0)}ms`);
      logger.error('Error en dashboard:get', error);
      return { agendamientos: [], servicios: [] };
    }
  });

  ipcMain.handle('dashboard:marcarAvisado', async (_event, itemId) => {
    try {
      return await dashboardService.marcarAvisado(itemId);
    } catch (error) {
      logger.error('Error en dashboard:marcarAvisado', error);
      return { ok: false, error: 'No se pudo registrar el aviso.' };
    }
  });

  ipcMain.handle('agendamientos:list', async (_event, filters) => {
    try { return await agendamientosService.listAgendamientos(filters); }
    catch (error) { logger.error('Error en agendamientos:list', error); return []; }
  });
  ipcMain.handle('agendamientos:get', async (_event, id) => {
    try { return await agendamientosService.getAgendamiento(id); }
    catch (error) { logger.error('Error en agendamientos:get', error); return null; }
  });
  ipcMain.handle('agendamientos:create', async (_event, data) => {
    try { return await agendamientosService.createAgendamiento(data); }
    catch (error) { logger.error('Error en agendamientos:create', error); return { ok: false, error: 'No se pudo guardar.' }; }
  });
  ipcMain.handle('agendamientos:update', async (_event, id, data) => {
    try { return await agendamientosService.updateAgendamiento(id, data); }
    catch (error) { logger.error('Error en agendamientos:update', error); return { ok: false, error: 'No se pudo actualizar.' }; }
  });
  ipcMain.handle('agendamientos:setEstado', async (_event, id, estado) => {
    try { return await agendamientosService.setEstadoAgendamiento(id, estado); }
    catch (error) { logger.error('Error en agendamientos:setEstado', error); return { ok: false, error: 'No se pudo cambiar el estado.' }; }
  });
  ipcMain.handle('agendamientos:delete', async (_event, id) => {
    try { return await agendamientosService.deleteAgendamiento(id); }
    catch (error) { logger.error('Error en agendamientos:delete', error); return { ok: false, error: 'No se pudo eliminar.' }; }
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

  ipcMain.handle('usuarios:list', async (_event, search) => {
    const denied = requireAdmin();
    if (denied) {
      return [];
    }

    try {
      return await usuariosService.listUsuarios(search);
    } catch (error) {
      logger.error('Error en usuarios:list', error);
      return [];
    }
  });

  ipcMain.handle('usuarios:get', async (_event, id) => {
    const denied = requireAdmin();
    if (denied) {
      return null;
    }

    try {
      return await usuariosService.getUsuario(id);
    } catch (error) {
      logger.error('Error en usuarios:get', error);
      return null;
    }
  });

  ipcMain.handle('usuarios:create', async (_event, data) => {
    const denied = requireAdmin();
    if (denied) {
      return denied;
    }

    try {
      return await usuariosService.createUsuario(data);
    } catch (error) {
      logger.error('Error en usuarios:create', error);
      return { ok: false, error: 'No se pudo crear el usuario.' };
    }
  });

  ipcMain.handle('usuarios:update', async (_event, id, data) => {
    const denied = requireAdmin();
    if (denied) {
      return denied;
    }

    try {
      const result = await usuariosService.updateUsuario(id, data, {
        currentUserId: currentSession?.id
      });

      if (result.ok && currentSession && Number(id) === Number(currentSession.id)) {
        currentSession = publicUser(await usuariosService.getUsuario(id)) || currentSession;
      }

      return result;
    } catch (error) {
      logger.error('Error en usuarios:update', error);
      return { ok: false, error: 'No se pudo actualizar el usuario.' };
    }
  });

  ipcMain.handle('usuarios:setActivo', async (_event, id, activo) => {
    const denied = requireAdmin();
    if (denied) {
      return denied;
    }

    try {
      return await usuariosService.setUsuarioActivo(id, activo, {
        currentUserId: currentSession?.id
      });
    } catch (error) {
      logger.error('Error en usuarios:setActivo', error);
      return { ok: false, error: 'No se pudo cambiar el estado del usuario.' };
    }
  });
}

module.exports = { registerIpcHandlers };
