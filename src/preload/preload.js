const { contextBridge, ipcRenderer } = require('electron');

const api = {
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  getEmpresa: () => ipcRenderer.invoke('empresa:get'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getDevBootstrap: () => ipcRenderer.invoke('app:getDevBootstrap'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  listClientes: (search) => ipcRenderer.invoke('clientes:list', search),
  getCliente: (id) => ipcRenderer.invoke('clientes:get', id),
  createCliente: (data) => ipcRenderer.invoke('clientes:create', data),
  updateCliente: (id, data) => ipcRenderer.invoke('clientes:update', id, data),
  deleteCliente: (id) => ipcRenderer.invoke('clientes:delete', id),
  listVehiculos: (search) => ipcRenderer.invoke('vehiculos:list', search),
  getVehiculo: (id) => ipcRenderer.invoke('vehiculos:get', id),
  getVehiculoByQrCode: (qrCode) => ipcRenderer.invoke('vehiculos:getByQrCode', qrCode),
  createVehiculo: (data) => ipcRenderer.invoke('vehiculos:create', data),
  updateVehiculo: (id, data) => ipcRenderer.invoke('vehiculos:update', id, data),
  deleteVehiculo: (id) => ipcRenderer.invoke('vehiculos:delete', id),
  listOrdenes: (search) => ipcRenderer.invoke('ordenes:list', search),
  getOrden: (id) => ipcRenderer.invoke('ordenes:get', id),
  createOrden: (data) => ipcRenderer.invoke('ordenes:create', data),
  updateOrden: (id, data) => ipcRenderer.invoke('ordenes:update', id, data),
  deleteOrden: (id) => ipcRenderer.invoke('ordenes:delete', id),
  listVehiculosByCliente: (clienteId) => ipcRenderer.invoke('ordenes:listVehiculosByCliente', clienteId),
  searchVehiculosForOrden: (search) => ipcRenderer.invoke('ordenes:searchVehiculos', search),
  listServiciosRealizados: (filters) => ipcRenderer.invoke('serviciosRealizados:list', filters),
  listProximosServicios: (filters) => ipcRenderer.invoke('proximosServicios:list', filters),
  getConfigEtiqueta: () => ipcRenderer.invoke('configEtiqueta:get'),
  updateConfigEtiqueta: (data) => ipcRenderer.invoke('configEtiqueta:update', data),
  getVehiculoQrDataUrl: (vehiculoId) => ipcRenderer.invoke('vehiculos:getQrDataUrl', vehiculoId),
  previewVehiculoEtiqueta: (vehiculoId) => ipcRenderer.invoke('vehiculos:previewEtiqueta', vehiculoId),
  downloadVehiculoEtiqueta: (vehiculoId) => ipcRenderer.invoke('vehiculos:downloadEtiqueta', vehiculoId),
  printVehiculoEtiqueta: (vehiculoId) => ipcRenderer.invoke('vehiculos:printEtiqueta', vehiculoId),
  buildEtiquetaPreviewHtml: (payload) => ipcRenderer.invoke('etiqueta:buildPreviewHtml', payload),
  exportDocumentPdf: (payload) => ipcRenderer.invoke('document:exportPdf', payload)
};

contextBridge.exposeInMainWorld('api', api);
