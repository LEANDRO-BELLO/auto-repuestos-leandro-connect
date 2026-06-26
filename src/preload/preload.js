const { contextBridge, ipcRenderer } = require('electron');

const api = {
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  getEmpresa: () => ipcRenderer.invoke('empresa:get'),
  getVersion: () => ipcRenderer.invoke('app:getVersion')
};

contextBridge.exposeInMainWorld('api', api);
