const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('contenoxDesktop', {
  platform: process.platform,
  // Recolors the Windows caption-button overlay to match the renderer theme ('dark' | 'light').
  setTitleBarTheme: theme => ipcRenderer.send('contenox:set-titlebar-theme', theme),
  selectDirectory: () => ipcRenderer.invoke('contenox:select-directory'),
  // Starts (or reuses) the runtime for a project folder -> { ok, key, prefix } | { ok:false, error }.
  ensureProjectRuntime: path => ipcRenderer.invoke('contenox:ensure-project-runtime', path),
  stopProjectRuntime: path => ipcRenderer.invoke('contenox:stop-project-runtime', path),
  // Folder requested via argv / CONTENOX_WORKSPACE / second instance; returns it once, then null.
  takeLaunchFolder: () => ipcRenderer.invoke('contenox:take-launch-folder'),
  // Subscribes to folders requested while the app is already running. Returns an unsubscribe function.
  onLaunchFolder: callback => {
    const listener = (_event, folder) => callback(folder);
    ipcRenderer.on('contenox:launch-folder', listener);
    return () => ipcRenderer.removeListener('contenox:launch-folder', listener);
  },
});
