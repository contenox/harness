const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('contenoxDesktop', {
  selectDirectory: () => ipcRenderer.invoke('contenox:select-directory'),
});
