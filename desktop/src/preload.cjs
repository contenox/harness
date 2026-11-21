const { contextBridge, ipcRenderer } = require('electron');

const distributionArg = process.argv.find(arg => arg.startsWith('--contenox-distribution='));

contextBridge.exposeInMainWorld('contenoxDesktop', {
  browser: {
    connector: id => ipcRenderer.invoke('contenox:browser-connector', id),
    mount: id => ipcRenderer.invoke('contenox:browser-mount', id),
    layout: (id, bounds) => ipcRenderer.invoke('contenox:browser-layout', id, bounds),
    action: (id, action, args) => ipcRenderer.invoke('contenox:browser-action', id, action, args),
    close: id => ipcRenderer.invoke('contenox:browser-close', id),
    subscribe: callback => {
      const listener = (_event, state) => callback(state);
      ipcRenderer.on('contenox:browser-state', listener);
      return () => ipcRenderer.removeListener('contenox:browser-state', listener);
    },
  },
  platform: process.platform,
  distribution: distributionArg ? distributionArg.slice('--contenox-distribution='.length) : 'direct',
  // Recolors the Windows caption-button overlay to match the renderer theme ('dark' | 'light').
  setTitleBarTheme: theme => ipcRenderer.send('contenox:set-titlebar-theme', theme),
  selectDirectory: () => ipcRenderer.invoke('contenox:select-directory'),
  // Starts (or reuses) the runtime for a project folder -> { ok, key, prefix } | { ok:false, error }.
  ensureProjectRuntime: path => ipcRenderer.invoke('contenox:ensure-project-runtime', path),
  // Opens a project folder in the OS file manager -> { ok } | { ok:false, error }.
  revealPath: path => ipcRenderer.invoke('contenox:reveal-path', path),
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
