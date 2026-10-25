const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('contenoxDesktop', {
  selectDirectory: () => ipcRenderer.invoke('contenox:select-directory'),
  pickWorkspace: () => ipcRenderer.invoke('contenox:pick-workspace'),
  useWorkspace: workspace => ipcRenderer.invoke('contenox:use-workspace', workspace),
  openWorkspace: () => ipcRenderer.invoke('contenox:open-workspace'),
  recentWorkspaces: () => ipcRenderer.invoke('contenox:recent-workspaces'),
});
