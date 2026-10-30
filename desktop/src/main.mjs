import { app, BrowserWindow, Menu, dialog, ipcMain, session, shell } from 'electron';
import { execFileSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startUiServer } from './server.mjs';
import { existingDir, validateWorkspace, workspaceFromArgv } from './workspaces.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

app.setPath('userData', path.join(app.getPath('appData'), 'ContenoxHarness'));

const configPath = path.join(app.getPath('userData'), 'workspace.json');
const logDir = path.join(app.getPath('userData'), 'logs');
const runtimeLogPath = path.join(logDir, 'runtime.log');

const IDLE_STOP_MS = 15 * 60 * 1000;
const IDLE_CHECK_MS = 60 * 1000;
const DEFAULT_KEY = 'default';

// Supervisor state. One runtime instance per project folder, all sharing one --data-dir/--db.
// instance: { key, path, child, origin, startingPromise, lastUsed, stopping }
const instances = new Map();
let defaultInstance = null;
let runtimeInitPromise = null;
let idleTimer = null;
let pendingLaunchFolder = null;

let ui = null;
let mainWindow = null;
let quitState = 0; // 0 running, 1 cleaning up, 2 ready to exit
const isQuitting = () => quitState !== 0;

// Only the UI port is persisted; older files may still carry current/recent which are ignored.
function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { uiPort: Number.isInteger(parsed.uiPort) && parsed.uiPort > 0 ? parsed.uiPort : 0 };
  } catch {
    return { uiPort: 0 };
  }
}

function writeConfig(patch) {
  const next = { ...readConfig(), ...patch };
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(next, null, 2));
  return next;
}

// Short stable id used in /rt/<key>/ URLs.
function projectKey(normalizedPath) {
  const subject = process.platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath;
  return crypto.createHash('sha256').update(subject).digest('hex').slice(0, 12);
}

function appendLog(text) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(runtimeLogPath, text.endsWith('\n') ? text : `${text}\n`);
  } catch {}
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

// ---- runtime supervisor ---------------------------------------------------------------------

function runtimeDirs() {
  return { data: path.join(app.getPath('userData'), 'data'), db: path.join(app.getPath('userData'), 'local.db') };
}

// Runs "init --force" once (only when the db is missing) before any serve starts.
function initRuntimeOnce() {
  if (!runtimeInitPromise) {
    runtimeInitPromise = (async () => {
      const binary = runtimeBinary();
      if (!fs.existsSync(binary)) throw new Error(`bundled runtime missing: ${binary}`);
      const { data, db } = runtimeDirs();
      fs.mkdirSync(data, { recursive: true });
      fs.mkdirSync(logDir, { recursive: true });
      if (!fs.existsSync(db)) {
        execFileSync(binary, ['--data-dir', data, '--db', db, 'init', '--force'], {
          env: { ...process.env, HOME: os.homedir() },
          stdio: 'ignore',
        });
      }
    })().catch(error => {
      runtimeInitPromise = null;
      throw error;
    });
  }
  return runtimeInitPromise;
}

async function startInstance(inst) {
  await initRuntimeOnce();
  const binary = runtimeBinary();
  const { data, db } = runtimeDirs();
  const port = await freePort();
  const log = fs.openSync(runtimeLogPath, 'a');
  fs.writeSync(log, `\n=== ${new Date().toISOString()} serve ${inst.path} [${inst.key}]\n`);
  const child = spawn(binary, ['--data-dir', data, '--db', db, 'serve', inst.path], {
    cwd: inst.path,
    env: { ...process.env, HOME: os.homedir(), ADDR: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', log, log],
  });
  fs.closeSync(log);
  inst.child = child;

  const failed = new Promise((_, reject) => {
    child.once('exit', (code, signal) => reject(new Error(`runtime exited during startup (${signal || code})`)));
    child.once('error', error => reject(error));
  });
  failed.catch(() => {});

  try {
    await Promise.race([waitForHealth(`http://127.0.0.1:${port}/health`), failed]);
  } catch (error) {
    inst.child = null;
    await terminate(child);
    const tail = logTail();
    throw new Error(tail ? `${error.message}\n\n${tail}` : error.message);
  }
  if (inst.stopping) {
    inst.child = null;
    await terminate(child);
    throw new Error('runtime was stopped during startup');
  }

  inst.origin = `http://127.0.0.1:${port}`;
  inst.lastUsed = Date.now();
  child.once('exit', (code, signal) => handleInstanceExit(inst, child, code, signal));
  return inst.origin;
}

async function stopInstance(inst) {
  inst.stopping = true;
  if (instances.get(inst.key) === inst) instances.delete(inst.key);
  const child = inst.child;
  inst.child = null;
  inst.origin = null;
  if (child) await terminate(child);
  // A start still in flight sees inst.stopping and terminates its own child.
  if (inst.startingPromise) await inst.startingPromise.catch(() => {});
}

function stopAllInstances() {
  return Promise.all([...instances.values()].map(inst => stopInstance(inst)));
}

function handleInstanceExit(inst, child, code, signal) {
  if (inst.child !== child) return;
  inst.child = null;
  inst.origin = null;
  if (instances.get(inst.key) === inst) instances.delete(inst.key);
  if (isQuitting() || inst.stopping) return;
  appendLog(`=== ${new Date().toISOString()} runtime [${inst.key}] ${inst.path} exited unexpectedly (${signal || code})`);
  if (inst !== defaultInstance) return; // project runtimes restart on the next ensureProjectRuntime
  const tail = logTail();
  void dialog
    .showMessageBox({
      type: 'error',
      title: 'Contenox runtime stopped',
      message: 'The local runtime exited unexpectedly.',
      detail: `Exit: ${signal || code}\n\n${tail || 'No log output.'}`,
      buttons: ['Restart', 'Quit'],
      defaultId: 0,
      cancelId: 1,
    })
    .then(async result => {
      if (result.response !== 0) {
        app.quit();
        return;
      }
      try {
        await startDefaultInstance();
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload();
      } catch (error) {
        showErrorDialog(error);
      }
    });
}

// The default instance serves ~/Contenox and all unprefixed (global) UI traffic.
async function startDefaultInstance() {
  const dir = path.join(os.homedir(), 'Contenox');
  fs.mkdirSync(dir, { recursive: true });
  const inst = {
    key: DEFAULT_KEY,
    path: existingDir(dir) ?? dir,
    child: null,
    origin: null,
    startingPromise: null,
    lastUsed: Date.now(),
    stopping: false,
  };
  defaultInstance = inst;
  instances.set(DEFAULT_KEY, inst);
  inst.startingPromise = startInstance(inst);
  try {
    await inst.startingPromise;
  } catch (error) {
    if (instances.get(DEFAULT_KEY) === inst) instances.delete(DEFAULT_KEY);
    throw error;
  } finally {
    inst.startingPromise = null;
  }
  return inst.origin;
}

// Returns { ok, key, prefix } for a project folder, starting its runtime if needed (concurrent calls share one start).
async function ensureProjectRuntime(target) {
  if (process.env.CONTENOX_DEV_URL) {
    // Dev mode (dev.mjs) runs a single runtime itself; there is no supervisor, so this reports an error.
    return { ok: false, error: 'Project runtimes are not available in dev mode.' };
  }
  if (isQuitting()) return { ok: false, error: 'Contenox is quitting.' };
  const check = validateWorkspace(target);
  if (check.error) return { ok: false, error: check.error };
  const key = projectKey(check.path);
  let inst = instances.get(key);
  if (inst && inst.startingPromise) {
    try {
      await inst.startingPromise;
    } catch (error) {
      return { ok: false, error: String(error.message) };
    }
  } else if (!inst || !inst.child || !inst.origin) {
    inst = { key, path: check.path, child: null, origin: null, startingPromise: null, lastUsed: Date.now(), stopping: false };
    instances.set(key, inst);
    const starting = startInstance(inst);
    inst.startingPromise = starting;
    try {
      await starting;
    } catch (error) {
      if (instances.get(key) === inst) instances.delete(key);
      return { ok: false, error: String(error.message) };
    } finally {
      inst.startingPromise = null;
    }
  }
  inst.lastUsed = Date.now();
  return { ok: true, key, prefix: `/rt/${key}` };
}

async function stopProjectRuntime(target) {
  const check = validateWorkspace(target);
  if (check.error) return { ok: false, error: check.error };
  const inst = instances.get(projectKey(check.path));
  if (!inst || inst === defaultInstance) return { ok: true };
  await stopInstance(inst);
  return { ok: true };
}

// Called by the UI server for every request: null = default instance, otherwise a project key.
function resolveTarget(key) {
  const inst = key === null ? defaultInstance : instances.get(key);
  if (!inst || inst.stopping || !inst.child) return null;
  return inst.origin;
}

function markActivity(key) {
  if (key === null) return;
  const inst = instances.get(key);
  if (inst) inst.lastUsed = Date.now();
}

function stopIdleInstances() {
  const now = Date.now();
  for (const inst of [...instances.values()]) {
    if (inst === defaultInstance || !inst.origin || inst.startingPromise) continue;
    if (ui && ui.openWebSockets(inst.key) > 0) continue; // open websockets count as in use
    if (now - inst.lastUsed < IDLE_STOP_MS) continue;
    appendLog(`=== ${new Date().toISOString()} stopping idle runtime [${inst.key}] ${inst.path}`);
    void stopInstance(inst);
  }
}

async function openUi() {
  const preferred = readConfig().uiPort;
  const options = { uiDir: uiDir(), resolveTarget, onActivity: markActivity };
  let server;
  try {
    server = await startUiServer({ ...options, port: preferred });
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    server = await startUiServer({ ...options, port: 0 });
  }
  if (server.port !== preferred) writeConfig({ uiPort: server.port });
  return server;
}

function uiDir() {
  return path.join(process.resourcesPath, 'ui');
}

// ---- windows --------------------------------------------------------------------------------

// Top bar height in the renderer (TitleBar is h-12) and the matching caption-button overlay.
const TITLEBAR_HEIGHT = 48;
const TITLEBAR_THEMES = {
  dark: { color: '#0f0f0f', symbolColor: '#e5e5e5' },
  light: { color: '#f8f7f4', symbolColor: '#2b2925' },
};

function titleBarOptions() {
  if (process.platform === 'darwin') {
    return { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 16 } };
  }
  return {
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...TITLEBAR_THEMES.dark, height: TITLEBAR_HEIGHT },
  };
}

function applyTitleBarTheme(window, theme) {
  if (process.platform === 'darwin' || !window || window.isDestroyed()) return;
  const colors = TITLEBAR_THEMES[theme];
  if (!colors || typeof window.setTitleBarOverlay !== 'function') return;
  window.setTitleBarOverlay({ ...colors, height: TITLEBAR_HEIGHT });
  window.setBackgroundColor(colors.color);
}

function windowOptions(extra = {}) {
  return {
    ...titleBarOptions(),
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

function hardenWindow(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    const allowed = [];
    if (process.env.CONTENOX_DEV_URL) allowed.push(new URL(process.env.CONTENOX_DEV_URL).origin);
    if (ui) allowed.push(`http://127.0.0.1:${ui.port}`);
    try {
      const target = new URL(url);
      if (!allowed.some(entry => target.origin === entry)) event.preventDefault();
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

function showMain(port) {
  const url = `http://127.0.0.1:${port}/`;
  if (!mainWindow || mainWindow.isDestroyed()) createMainWindow(url);
}

function focusMain() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// Hands a folder requested from outside (argv, env, second instance) to the UI.
// takeLaunchFolder() returns it once; the event reaches an already-loaded window immediately.
function offerLaunchFolder(folder) {
  const real = existingDir(folder);
  if (!real) return;
  pendingLaunchFolder = real;
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send('contenox:launch-folder', real);
  }
}

// ---- menu / dialogs -------------------------------------------------------------------------

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
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

async function chooseFolder(parent = mainWindow) {
  const options = {
    title: 'Choose a project folder',
    buttonLabel: 'Choose Folder',
    properties: ['openDirectory', 'createDirectory'],
  };
  const result = parent && !parent.isDestroyed()
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled) return null;
  return result.filePaths[0] ?? null;
}

function showErrorDialog(error) {
  void dialog.showMessageBox({
    type: 'error',
    title: 'Contenox',
    message: 'Contenox ran into a problem.',
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

// ---- IPC ------------------------------------------------------------------------------------

function trusted(event) {
  const url = event.senderFrame?.url || '';
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
handle('contenox:ensure-project-runtime', target => ensureProjectRuntime(target));
handle('contenox:stop-project-runtime', target => stopProjectRuntime(target));
ipcMain.on('contenox:set-titlebar-theme', (event, theme) => {
  if (!trusted(event)) return;
  applyTitleBarTheme(BrowserWindow.fromWebContents(event.sender), theme);
});
handle('contenox:take-launch-folder', () => {
  const folder = pendingLaunchFolder;
  pendingLaunchFolder = null;
  return folder;
});

// ---- shutdown -------------------------------------------------------------------------------

// Last resort: a socket that resets while we are tearing down must not pop the Electron
// "JavaScript error in the main process" dialog. Anything else is rethrown as usual.
process.on('uncaughtException', error => {
  const benign = error && (error.code === 'ECONNRESET' || error.code === 'EPIPE');
  if (isQuitting() && benign) {
    appendLog(`=== ${new Date().toISOString()} ignored ${error.code} during shutdown: ${error.message}`);
    return;
  }
  throw error;
});

async function shutdown() {
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = null;
  // 1. windows (and with them their live websockets), 2. UI server, 3. runtimes.
  for (const window of BrowserWindow.getAllWindows()) {
    try { window.destroy(); } catch {}
  }
  mainWindow = null;
  if (ui) {
    const closing = ui;
    ui = null;
    await closing.close();
  }
  await stopAllInstances();
}

// ---- app lifecycle --------------------------------------------------------------------------

const hasLock = process.env.CONTENOX_DEV_URL ? true : app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
}

if (hasLock) {
  app.on('second-instance', (_event, argv, workingDirectory) => {
    const args = argv.slice(1);
    const requested = args.some(arg => arg && !arg.startsWith('-')) ? workspaceFromArgv(args, workingDirectory) : null;
    if (requested) offerLaunchFolder(requested);
    if (mainWindow && !mainWindow.isDestroyed()) focusMain();
    else if (ui) showMain(ui.port);
  });

  app.whenReady().then(async () => {
    buildMenu();
    allowMicrophoneForOwnUi();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length !== 0) return;
      if (ui) showMain(ui.port);
    });

    if (process.env.CONTENOX_DEV_URL) {
      createMainWindow(process.env.CONTENOX_DEV_URL);
      return;
    }

    const args = process.argv.slice(app.isPackaged ? 1 : 2);
    const fromArgv = workspaceFromArgv(args, process.cwd());
    const fromEnv = process.env.CONTENOX_WORKSPACE ? path.resolve(process.env.CONTENOX_WORKSPACE) : null;
    const wanted = fromArgv ?? fromEnv;
    if (wanted) offerLaunchFolder(wanted);

    try {
      await startDefaultInstance();
      ui = await openUi();
    } catch (error) {
      dialog.showErrorBox('Contenox could not start', String(error?.message ?? error));
      app.quit();
      return;
    }
    idleTimer = setInterval(stopIdleInstances, IDLE_CHECK_MS);
    idleTimer.unref?.();
    showMain(ui.port);
  });
}

app.on('before-quit', event => {
  if (quitState === 2) return;
  event.preventDefault();
  if (quitState === 1) return;
  quitState = 1;
  void shutdown()
    .catch(error => appendLog(`=== shutdown error: ${error?.message ?? error}`))
    .finally(() => {
      quitState = 2;
      app.quit();
    });
});

app.on('window-all-closed', () => {
  if (isQuitting()) return;
  if (process.platform !== 'darwin') app.quit();
});
