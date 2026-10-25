import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startUiServer } from './server.mjs';

let runtime;
let ui;
let window;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function waitFor(url) {
  for (let i = 0; i < 240; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`runtime did not become ready at ${url}`);
}

async function startRuntime() {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const binary = path.join(process.resourcesPath, 'runtime', `contenox-runtime${suffix}`);
  if (!fs.existsSync(binary)) throw new Error(`bundled runtime missing: ${binary}`);
  const home = app.getPath('home');
  const data = path.join(app.getPath('userData'), 'data');
  const db = path.join(app.getPath('userData'), 'local.db');
  const workspace = path.join(home, 'Contenox');
  fs.mkdirSync(data, { recursive: true });
  fs.mkdirSync(workspace, { recursive: true });
  if (!fs.existsSync(db)) {
    execFileSync(binary, ['--data-dir', data, '--db', db, 'init', '--force'], { env: { ...process.env, HOME: home }, stdio: 'ignore' });
  }
  const port = await freePort();
  runtime = spawn(binary, ['--data-dir', data, '--db', db, 'serve', workspace], {
    cwd: workspace,
    env: { ...process.env, HOME: home, ADDR: '127.0.0.1', PORT: String(port) },
    stdio: 'ignore',
  });
  await waitFor(`http://127.0.0.1:${port}/health`);
  return `http://127.0.0.1:${port}`;
}

ipcMain.handle('contenox:select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

function createWindow(url) {
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    title: 'Contenox',
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.cjs'),
    },
  });
  window.loadURL(url);
}

app.setPath('userData', path.join(app.getPath('appData'), 'ContenoxHarness'));

app.whenReady().then(async () => {
  try {
    if (process.env.CONTENOX_DEV_URL) {
      createWindow(process.env.CONTENOX_DEV_URL);
      return;
    }
    const origin = await startRuntime();
    ui = await startUiServer({ uiDir: path.join(process.resourcesPath, 'ui'), runtimeOrigin: origin });
    createWindow(`http://127.0.0.1:${ui.port}/`);
  } catch (error) {
    dialog.showErrorBox('Contenox failed to start', error.message);
    app.quit();
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(window?.webContents.getURL() || 'about:blank');
  });
});

app.on('before-quit', async () => {
  if (runtime) runtime.kill();
  if (ui) await ui.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
