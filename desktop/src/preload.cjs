const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('contenoxDesktop', {
  selectDirectory: () => ipcRenderer.invoke('contenox:select-directory'),
  openWorkspace: () => ipcRenderer.invoke('contenox:open-workspace'),
  recentWorkspaces: () => ipcRenderer.invoke('contenox:recent-workspaces'),
});
