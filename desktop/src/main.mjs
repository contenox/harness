import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startUiServer } from './server.mjs';

app.setPath('userData', path.join(app.getPath('appData'), 'ContenoxHarness'));

let runtime;
let ui;
let window;
let pickerWindow;

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

async function startRuntime(workspace) {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const binary = path.join(process.resourcesPath, 'runtime', `contenox-runtime${suffix}`);
  if (!fs.existsSync(binary)) throw new Error(`bundled runtime missing: ${binary}`);
  if (!fs.existsSync(workspace)) throw new Error(`workspace folder missing: ${workspace}`);
  const home = app.getPath('home');
  const data = path.join(app.getPath('userData'), 'data');
  const db = path.join(app.getPath('userData'), 'local.db');
  fs.mkdirSync(data, { recursive: true });
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

const workspaceConfigPath = path.join(app.getPath('userData'), 'workspace.json');

function readWorkspaceConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(workspaceConfigPath, 'utf8'));
    const current = typeof parsed.current === 'string' ? parsed.current : '';
    const recent = Array.isArray(parsed.recent) ? parsed.recent.filter(p => typeof p === 'string') : [];
    return { current, recent };
  } catch {
    return { current: '', recent: [] };
  }
}

function persistWorkspace(workspace) {
  const previous = readWorkspaceConfig();
  const recent = [workspace, ...previous.recent.filter(p => p !== workspace)].slice(0, 10);
  fs.mkdirSync(path.dirname(workspaceConfigPath), { recursive: true });
  fs.writeFileSync(workspaceConfigPath, JSON.stringify({ current: workspace, recent }, null, 2));
}

function existingWorkspace(candidate) {
  if (!candidate) return null;
  try {
    return fs.statSync(candidate).isDirectory() ? candidate : null;
  } catch {
    return null;
  }
}

async function chooseWorkspaceFolder(parent = window) {
  const options = {
    title: 'Choose a workspace folder',
    buttonLabel: 'Use this folder',
    properties: ['openDirectory', 'createDirectory'],
  };
  const result = parent && !parent.isDestroyed()
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled) return null;
  return result.filePaths[0] ?? null;
}

function startupWorkspace() {
  return existingWorkspace(process.env.CONTENOX_WORKSPACE)
    ?? existingWorkspace(readWorkspaceConfig().current);
}

async function launchWorkspace(workspace) {
  const origin = await startRuntime(workspace);
  ui = await startUiServer({ uiDir: path.join(process.resourcesPath, 'ui'), runtimeOrigin: origin });
  if (!window) {
    createWindow(`http://127.0.0.1:${ui.port}/`);
  } else {
    await window.loadURL(`http://127.0.0.1:${ui.port}/`);
  }
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.close();
    pickerWindow = null;
  }
}

async function openWorkspaceFromUi() {
  if (!window) return false;
  const selected = await chooseWorkspaceFolder(window);
  if (!selected) return false;
  persistWorkspace(selected);
  await restartWithWorkspace(selected);
  return true;
}

let restarting = false;

async function restartWithWorkspace(workspace) {
  if (restarting) return;
  restarting = true;
  try {
    if (runtime) {
      runtime.kill();
      runtime = null;
    }
    if (ui) {
      await ui.close();
      ui = null;
    }
    const origin = await startRuntime(workspace);
    ui = await startUiServer({ uiDir: path.join(process.resourcesPath, 'ui'), runtimeOrigin: origin });
    if (window) await window.loadURL(`http://127.0.0.1:${ui.port}/`);
  } finally {
    restarting = false;
  }
}

ipcMain.handle('contenox:select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

ipcMain.handle('contenox:pick-workspace', () => chooseWorkspaceFolder(pickerWindow ?? window));
ipcMain.handle('contenox:use-workspace', async (_event, workspace) => {
  const valid = existingWorkspace(workspace);
  if (!valid) return { ok: false, error: 'That folder does not exist.' };
  try {
    persistWorkspace(valid);
    await launchWorkspace(valid);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});
ipcMain.handle('contenox:open-workspace', () => openWorkspaceFromUi());
ipcMain.handle('contenox:recent-workspaces', () => readWorkspaceConfig().recent);

function createPickerWindow() {
  pickerWindow = new BrowserWindow({
    width: 920,
    height: 620,
    minWidth: 760,
    minHeight: 520,
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
  pickerWindow.loadFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'workspace.html'));
  pickerWindow.on('closed', () => {
    pickerWindow = null;
  });
}

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

app.whenReady().then(async () => {
  try {
    if (process.env.CONTENOX_DEV_URL) {
      createWindow(process.env.CONTENOX_DEV_URL);
      return;
    }
    const workspace = startupWorkspace();
    if (workspace) {
      await launchWorkspace(workspace);
    } else {
      createPickerWindow();
    }
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
