const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (data) => ipcRenderer.invoke('login', data),
  getEmpresa: () => ipcRenderer.invoke('empresa:get'),
  listClientes: (query) => ipcRenderer.invoke('clientes:list', query),
  createCliente: (cliente) => ipcRenderer.invoke('clientes:create', cliente),
  listVehiculos: (query) => ipcRenderer.invoke('vehiculos:list', query),
  createVehiculo: (vehiculo) => ipcRenderer.invoke('vehiculos:create', vehiculo)
});
