import { app, BrowserWindow, Menu, dialog, ipcMain, session, shell } from 'electron';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startUiServer } from './server.mjs';
import { existingDir, validateWorkspace, workspaceFromArgv } from './workspaces.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

app.setPath('userData', path.join(app.getPath('appData'), 'ContenoxHarness'));

const configPath = path.join(app.getPath('userData'), 'workspace.json');
const logDir = path.join(app.getPath('userData'), 'logs');
const runtimeLogPath = path.join(logDir, 'runtime.log');

let runtime = null;
let starting = null;
let ui = null;
let mainWindow = null;
let pickerWindow = null;
let currentWorkspace = null;
let quitting = false;



let switchQueue = Promise.resolve();



function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return {
      current: typeof parsed.current === 'string' ? parsed.current : '',
      recent: Array.isArray(parsed.recent) ? parsed.recent.filter(p => typeof p === 'string') : [],
      uiPort: Number.isInteger(parsed.uiPort) && parsed.uiPort > 0 ? parsed.uiPort : 0,
    };
  } catch {
    return { current: '', recent: [], uiPort: 0 };
  }
}

function writeConfig(patch) {
  const next = { ...readConfig(), ...patch };
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(next, null, 2));
  return next;
}

function rememberWorkspace(workspace) {
  const previous = readConfig();
  const recent = [workspace, ...previous.recent.filter(p => p !== workspace)].slice(0, 10);
  return writeConfig({ current: workspace, recent });
}

function forgetRecent(workspace) {
  const previous = readConfig();
  return writeConfig({ recent: previous.recent.filter(p => p !== workspace) });
}





function runtimeBinary() {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  return process.env.CONTENOX_RUNTIME_BIN || path.join(process.resourcesPath, 'runtime', `contenox-runtime${suffix}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`runtime did not become ready at ${url}`);
}

function logTail(maxLines = 20) {
  try {
    const { size } = fs.statSync(runtimeLogPath);
    const start = Math.max(0, size - 8192);
    const buffer = Buffer.alloc(size - start);
    const fd = fs.openSync(runtimeLogPath, 'r');
    fs.readSync(fd, buffer, 0, buffer.length, start);
    fs.closeSync(fd);
    const text = buffer.toString('utf8').trim();
    return text ? text.split('\n').slice(-maxLines).join('\n') : '';
  } catch {
    return '';
  }
}

function terminate(child) {
  return new Promise(resolve => {
    if (!child || child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      resolve();
    };
    const killTimer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      setTimeout(finish, 1000);
    }, 5000);
    child.once('exit', finish);
    try {
      child.kill('SIGTERM');
    } catch {
      finish();
    }
  });
}



async function startRuntime(workspace) {
  const binary = runtimeBinary();
  if (!fs.existsSync(binary)) throw new Error(`bundled runtime missing: ${binary}`);

  const data = path.join(app.getPath('userData'), 'data');
  const db = path.join(app.getPath('userData'), 'local.db');
  fs.mkdirSync(data, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
  if (!fs.existsSync(db)) {
    execFileSync(binary, ['--data-dir', data, '--db', db, 'init', '--force'], {
      env: { ...process.env, HOME: os.homedir() },
      stdio: 'ignore',
    });
  }

  const port = await freePort();
  const log = fs.openSync(runtimeLogPath, 'a');
  fs.writeSync(log, `\n=== ${new Date().toISOString()} serve ${workspace}\n`);
  const child = spawn(binary, ['--data-dir', data, '--db', db, 'serve', workspace], {
    cwd: workspace,
    env: { ...process.env, HOME: os.homedir(), ADDR: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', log, log],
  });
  fs.closeSync(log);

  starting = child;
  const failed = new Promise((_, reject) => {
    child.once('exit', (code, signal) => reject(new Error(`runtime exited during startup (${signal || code})`)));
    child.once('error', error => reject(error));
  });

  try {
    await Promise.race([waitForHealth(`http://127.0.0.1:${port}/health`), failed]);
  } catch (error) {
    if (starting === child) starting = null;
    await terminate(child);
    const tail = logTail();
    throw new Error(tail ? `${error.message}\n\n${tail}` : error.message);
  }

  if (starting === child) starting = null;
  runtime = child;
  child.once('exit', (code, signal) => handleRuntimeExit(child, code, signal));
  return `http://127.0.0.1:${port}`;
}

async function stopRuntime() {
  const child = runtime;
  const pending = starting;
  runtime = null;
  starting = null;
  if (pending) await terminate(pending);
  if (child) await terminate(child);
}

function handleRuntimeExit(child, code, signal) {
  if (child !== runtime) return;
  runtime = null;
  if (quitting) return;
  const tail = logTail();
  void dialog
    .showMessageBox({
      type: 'error',
      title: 'Contenox runtime stopped',
      message: 'The local runtime exited unexpectedly.',
      detail: `Exit: ${signal || code}\n\n${tail || 'No log output.'}`,
      buttons: ['Restart', 'Choose Workspace', 'Quit'],
      defaultId: 0,
      cancelId: 1,
    })
    .then(result => {
      if (result.response === 0 && currentWorkspace) {
        void enqueue(() => performSwitch(currentWorkspace)).catch(showErrorDialog);
      } else if (result.response === 1) {
        showPicker();
      } else {
        app.quit();
      }
    });
}



async function openUi(runtimeOrigin) {
  const preferred = readConfig().uiPort;
  let server;
  try {
    server = await startUiServer({ uiDir: uiDir(), runtimeOrigin, port: preferred });
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    server = await startUiServer({ uiDir: uiDir(), runtimeOrigin, port: 0 });
  }
  if (server.port !== preferred) writeConfig({ uiPort: server.port });
  return server;
}

function uiDir() {
  return path.join(process.resourcesPath, 'ui');
}



function enqueue(task) {
  const run = switchQueue.then(task, task);
  switchQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function switchWorkspace(target) {
  return enqueue(() => performSwitch(target));
}

async function performSwitch(target) {
  if (quitting) throw new Error('Contenox is quitting.');
  const check = validateWorkspace(target);
  if (check.error) throw new Error(check.error);
  const next = check.path;

  if (next === currentWorkspace && runtime && ui) {
    await showMain(ui.port);
    focusMain();
    return;
  }

  const previous = currentWorkspace;
  await stopRuntime();

  try {
    const origin = await startRuntime(next);
    if (ui) ui.setRuntimeOrigin(origin);
    else ui = await openUi(origin);
    currentWorkspace = next;
    rememberWorkspace(next);
    buildMenu();
    await showMain(ui.port);
    closePicker();
    return;
  } catch (error) {
    if (quitting) throw error;
    let restored = false;
    if (previous && previous !== next) {
      try {
        const origin = await startRuntime(previous);
        if (ui) ui.setRuntimeOrigin(origin);
        else ui = await openUi(origin);
        currentWorkspace = previous;
        await showMain(ui.port);
        restored = true;
      } catch {}
    }
    if (!restored) currentWorkspace = null;
    const note = restored ? `\n\nThe previous workspace is still open:\n${previous}` : '';
    throw new Error(`${error.message}${note}`);
  }
}

function closeWorkspace() {
  return enqueue(async () => {
    await stopRuntime();
    if (ui) {
      const closing = ui;
      ui = null;
      await closing.close();
    }
    currentWorkspace = null;
    writeConfig({ current: '' });
    buildMenu();
    showPicker();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
      mainWindow = null;
    }
  });
}



function windowOptions(extra = {}) {
  return {
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
      preload: path.join(here, 'preload.cjs'),
    },
    ...extra,
  };
}

function hardenWindow(window, { allowFile = false } = {}) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    const allowed = [];
    if (allowFile) allowed.push('file://');
    if (process.env.CONTENOX_DEV_URL) allowed.push(new URL(process.env.CONTENOX_DEV_URL).origin);
    if (ui) allowed.push(`http://127.0.0.1:${ui.port}`);
    try {
      const target = new URL(url);
      const ok = allowed.some(entry => (entry === 'file://' ? url.startsWith(pickerUrl()) : target.origin === entry));
      if (!ok) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow(windowOptions());
  hardenWindow(mainWindow);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  void mainWindow.loadURL(url);
}

async function showMain(port) {
  const url = `http://127.0.0.1:${port}/`;
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow(url);
    return;
  }
  await mainWindow.loadURL(url);
}

function focusMain() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createPickerWindow(message = '') {
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    focusPicker();
    return;
  }
  pickerWindow = new BrowserWindow(windowOptions({ width: 920, height: 620, minWidth: 760, minHeight: 520 }));
  hardenWindow(pickerWindow, { allowFile: true });
  pickerWindow.on('closed', () => {
    pickerWindow = null;
  });
  void pickerWindow.loadFile(path.join(here, 'workspace.html'), { query: message ? { error: message } : {} });
}

function showPicker(message = '') {
  createPickerWindow(message);
  focusPicker();
}

function focusPicker() {
  if (!pickerWindow || pickerWindow.isDestroyed()) return;
  if (pickerWindow.isMinimized()) pickerWindow.restore();
  pickerWindow.show();
  pickerWindow.focus();
}

function closePicker() {
  if (pickerWindow && !pickerWindow.isDestroyed()) pickerWindow.close();
  pickerWindow = null;
}



function buildMenu() {
  const isMac = process.platform === 'darwin';
  const recent = readConfig().recent.filter(workspace => existingDir(workspace));
  const openRecent = recent.length
    ? [
        ...recent.map(workspace => ({
          label: `${path.basename(workspace)} — ${workspace}`,
          click: () => void switchWorkspace(workspace).catch(showErrorDialog),
        })),
        { type: 'separator' },
        {
          label: 'Clear Recent Workspaces',
          click: () => {
            writeConfig({ recent: [] });
            buildMenu();
          },
        },
      ]
    : [{ label: 'No recent workspaces', enabled: false }];

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Open Workspace…', accelerator: 'CmdOrCtrl+O', click: () => void openWorkspaceFromDialog() },
        { label: 'Open Recent', submenu: openRecent },
        { type: 'separator' },
        { label: 'Close Workspace', click: () => void closeWorkspace() },
        { type: 'separator' },
        { label: 'Install ‘contenox’ Command in PATH', enabled: app.isPackaged, click: () => void installCommandLineTool('contenox', app.getPath('exe')) },
        { label: 'Install ‘contenox-runtime’ Command in PATH', enabled: app.isPackaged, click: () => void installCommandLineTool('contenox-runtime', runtimeBinary()) },
        { label: 'Open Logs Folder', click: () => void shell.openPath(logDir) },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      role: 'help',
      submenu: [{ label: 'Contenox Website', click: () => void shell.openExternal('https://contenox.com') }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function openWorkspaceFromDialog({ report = true } = {}) {
  const selected = await chooseFolder();
  if (!selected) return { ok: false, cancelled: true };
  try {
    await switchWorkspace(selected);
    return { ok: true };
  } catch (error) {
    if (report) showErrorDialog(error);
    return { ok: false, error: String(error.message) };
  }
}

async function chooseFolder(parent = mainWindow) {
  const options = {
    title: 'Choose a workspace folder',
    buttonLabel: 'Open Workspace',
    properties: ['openDirectory', 'createDirectory'],
  };
  const window = parent && !parent.isDestroyed() ? parent : pickerWindow;
  const result = window && !window.isDestroyed()
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled) return null;
  return result.filePaths[0] ?? null;
}

function showErrorDialog(error) {
  void dialog.showMessageBox({
    type: 'error',
    title: 'Contenox',
    message: 'The workspace could not be opened.',
    detail: String(error?.message ?? error),
    buttons: ['OK'],
  });
}



async function installCommandLineTool(name, target) {
  try {
    if (!app.isPackaged) throw new Error('Available in the packaged app.');
    if (!fs.existsSync(target)) throw new Error(`target missing: ${target}`);
    let destination;
    if (process.platform === 'win32') {
      const dir = path.join(app.getPath('userData'), 'bin');
      fs.mkdirSync(dir, { recursive: true });
      destination = path.join(dir, `${name}.cmd`);
      fs.writeFileSync(destination, `@echo off\r\n"${target}" %*\r\n`);
    } else {
      const dir = path.join(os.homedir(), '.local', 'bin');
      fs.mkdirSync(dir, { recursive: true });
      destination = path.join(dir, name);
      let existing = null;
      try { existing = fs.readlinkSync(destination); } catch {}
      if (existing === target) {
        await showInfo(`${destination} already points at Contenox.`);
        return;
      }
      if (existing) fs.unlinkSync(destination);
      else if (fs.existsSync(destination)) throw new Error(`${destination} exists and is not a symlink`);
      fs.symlinkSync(target, destination);
    }
    const onPath = (process.env.PATH || '').split(path.delimiter).includes(path.dirname(destination));
    await showInfo(
      `Installed ${destination}.` +
        (onPath ? '' : `\n\nAdd ${path.dirname(destination)} to your PATH to use it from any terminal.`),
    );
  } catch (error) {
    showErrorDialog(error);
  }
}

function showInfo(detail) {
  return dialog.showMessageBox({ type: 'info', title: 'Contenox', message: 'Command line tool', detail, buttons: ['OK'] });
}



function pickerUrl() {
  return pathToFileURL(path.join(here, 'workspace.html')).href;
}

function trusted(event) {
  const url = event.senderFrame?.url || '';
  if (url.startsWith(pickerUrl())) return true;
  if (ui && url.startsWith(`http://127.0.0.1:${ui.port}`)) return true;
  if (process.env.CONTENOX_DEV_URL && url.startsWith(process.env.CONTENOX_DEV_URL)) return true;
  return false;
}

// Microphone only (no video), and only for the app's own UI origin or the dev URL.
function allowMicrophoneForOwnUi() {
  const ownOrigin = origin => {
    if (!origin) return false;
    if (ui && origin === `http://127.0.0.1:${ui.port}`) return true;
    return Boolean(process.env.CONTENOX_DEV_URL) && origin === new URL(process.env.CONTENOX_DEV_URL).origin;
  };
  const micOnly = (permission, origin, mediaTypes) =>
    permission === 'media' && ownOrigin(origin) && !(mediaTypes ?? []).includes('video');
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback, details) => {
    let origin = '';
    try {
      origin = new URL(details.requestingUrl).origin;
    } catch {}
    callback(micOnly(permission, origin, details.mediaTypes));
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission, requestingOrigin, details) =>
    micOnly(permission, requestingOrigin, details.mediaType === 'video' ? ['video'] : []),
  );
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!trusted(event)) return { ok: false, error: 'Untrusted sender' };
    try {
      return await fn(...args);
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) };
    }
  });
}

handle('contenox:select-directory', () => chooseFolder());
handle('contenox:pick-workspace', () => chooseFolder(pickerWindow));
handle('contenox:open-workspace', () => openWorkspaceFromDialog({ report: false }));
handle('contenox:use-workspace', async workspace => {
  await switchWorkspace(workspace);
  return { ok: true };
});
handle('contenox:current-workspace', () => ({ ok: true, workspace: currentWorkspace }));
handle('contenox:recent-workspaces', () => readConfig().recent);
handle('contenox:forget-recent', workspace => ({ ok: true, recent: forgetRecent(workspace).recent }));





const hasLock = process.env.CONTENOX_DEV_URL ? true : app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
}

if (hasLock) {
  app.on('second-instance', (_event, argv, workingDirectory) => {
    const args = argv.slice(1);
    const requested = args.some(arg => arg && !arg.startsWith('-')) ? workspaceFromArgv(args, workingDirectory) : null;
    if (requested) {
      void switchWorkspace(requested).catch(showErrorDialog);
      return;
    }
    if (mainWindow && !mainWindow.isDestroyed()) focusMain();
    else showPicker();
  });

  app.whenReady().then(async () => {
    buildMenu();
    allowMicrophoneForOwnUi();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length !== 0) return;
      if (ui) void showMain(ui.port);
      else showPicker();
    });

    if (process.env.CONTENOX_DEV_URL) {
      createMainWindow(process.env.CONTENOX_DEV_URL);
      return;
    }

    const args = process.argv.slice(app.isPackaged ? 1 : 2);
    const fromArgv = workspaceFromArgv(args, process.cwd());
    const fromEnv = process.env.CONTENOX_WORKSPACE ? path.resolve(process.env.CONTENOX_WORKSPACE) : null;
    const configured = readConfig().current ? path.resolve(readConfig().current) : null;
    const wanted = fromArgv ?? fromEnv ?? configured;

    if (!wanted) {
      showPicker();
      return;
    }
    try {
      await switchWorkspace(wanted);
    } catch (error) {
      showPicker(String(error.message));
    }
  });
}

app.on('before-quit', event => {
  if (quitting) return;
  if (!runtime && !starting && !ui) return;
  event.preventDefault();
  quitting = true;
  void (async () => {
    await stopRuntime();
    if (ui) {
      const closing = ui;
      ui = null;
      await closing.close();
    }
    app.quit();
  })();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
