import { BrowserWindow, session, WebContentsView } from 'electron';
import { randomBytes, randomUUID } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { browserConnector, matchesBrowser, installationId } from './browserConnector.mjs';
import { fileURLToPath } from 'node:url';

const recorderPage = fileURLToPath(new URL('./browser-record.html', import.meta.url));


function webURL(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Enter an HTTP or HTTPS address.');
  }
  return url.href;
}

// Capture in a trusted, temporary renderer. Only that renderer is granted
// the target tab's media stream. Closing either tab tears down the recorder.
async function recordTab(contents, seconds) {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 10) throw new Error('Choose 1–10 seconds.');
  const recorder = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'browser-record-' + randomUUID(),
      backgroundThrottling: false,
    },
  });
  const capture = recorder.webContents;
  const stop = () => {
    if (!recorder.isDestroyed()) recorder.destroy();
  };
  const timeout = setTimeout(stop, (seconds + 8) * 1000);
  contents.once('destroyed', stop);
  capture.session.setDisplayMediaRequestHandler((request, grant) => {
    if (request.frame !== capture.mainFrame || contents.isDestroyed()) return grant({});
    grant({ video: contents.mainFrame, audio: contents.mainFrame });
  });
  try {
    await recorder.loadFile(recorderPage);
    const data = await capture.executeJavaScript(`recordTabAudio(${seconds})`, true);
    return Buffer.from(data);
  } finally {
    clearTimeout(timeout);
    contents.removeListener('destroyed', stop);
    if (!capture.isDestroyed()) capture.session.setDisplayMediaRequestHandler(null);
    stop();
  }
}

export function createBrowserHost({ window, runtimeOrigin, protectedPorts, endpointFile }) {
  let tab;
  let closeGeneration = 0;
  let server;
  const key = randomBytes(32).toString('hex');
  const state = () => ({
    url: tab?.view.webContents.getURL() || '',
    title: tab?.view.webContents.getTitle() || '',
  });
  const publish = () => window()?.webContents.send('contenox:browser-state', state());
  const hide = () => {
    if (!tab || !window() || window().isDestroyed()) return;
    // Keep the tab attached so it can render while chat is open.
    const { width, height } = tab.view.getBounds();
    if (tab.view.webContents.isFocused()) window().webContents.focus();
    tab.view.setBounds({ x: -width - 1, y: 0, width, height });
  };
  function close(id) {
    if (tab && id && id !== tab.id) return;
    closeGeneration++;
    if (!tab) return;
    if (window() && !window().isDestroyed()) window().contentView.removeChildView(tab.view);
    tab.view.webContents.close({ waitForBeforeUnload: false });
    tab = undefined;
  }
  async function verify(id) {
    if (!installationId.test(id)) throw new Error('Invalid Browser installation.');
    const origin = runtimeOrigin();
    if (!origin) throw new Error('Runtime is unavailable.');
    const response = await fetch(origin + '/api/mcp-servers/by-name/browser', {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      if (response.status === 404) close(id);
      throw new Error('Install Browser in Connectors.');
    }
    const config = await response.json();
    if (!matchesBrowser(config, browserConnector(id, endpointFile))) {
      close(id);
      throw new Error('Browser installation changed.');
    }
  }
  async function getTab(id) {
    const started = closeGeneration;
    await verify(id);
    if (started !== closeGeneration) throw new Error('Browser tab was closed.');
    if (tab?.id === id && !tab.view.webContents.isDestroyed()) return tab;
    if (tab) close();
    const ses = session.fromPartition('persist:contenox-browser-' + id);
    ses.setPermissionCheckHandler(() => false);
    ses.setPermissionRequestHandler((_wc, _perm, callback) => callback(false));
    ses.webRequest.onBeforeRequest((request, done) => {
      const url = new URL(request.url);
      const network = ['https:', 'http:', 'wss:', 'ws:'].includes(url.protocol);
      const embedded = ['data:', 'blob:', 'about:'].includes(url.protocol);
      const internal =
        network &&
        protectedPorts().includes(
          Number(url.port || (['https:', 'wss:'].includes(url.protocol) ? 443 : 80)),
        );
      done({ cancel: internal || !(network || embedded) });
    });
    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
      },
    });
    const wc = view.webContents;
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
    wc.on('will-navigate', (event, url) => {
      try {
        webURL(url);
      } catch {
        event.preventDefault();
      }
    });
    wc.on('did-navigate', publish);
    wc.on('did-navigate-in-page', publish);
    wc.on('page-title-updated', publish);
    tab = { id, view, recording: false };
    if (!window()) {
      close();
      throw new Error('Open Contenox to use Browser.');
    }
    view.setBounds({ x: -1025, y: 0, width: 1024, height: 768 });
    window().contentView.addChildView(view);
    return tab;
  }
  async function mount(id) {
    await getTab(id);
    return state();
  }
  function layout(id, bounds) {
    if (!tab || tab.id !== id || !window()) return;
    if (!bounds) return hide();
    const size = window().getContentBounds();
    const zoom = window().webContents.getZoomFactor();
    const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((k) => Math.round(bounds[k] * zoom));
    const width = Math.min(w, size.width - x);
    const height = Math.min(h, size.height - y);
    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width < 1 || height < 1) return hide();
    tab.view.setBounds({ x, y, width, height });
  }
  async function action(id, name, args = {}) {
    const entry = await getTab(id);
    const wc = entry.view.webContents;
    switch (name) {
      case 'navigate':
        await wc.loadURL(webURL(args.url));
        return state();
      case 'back':
        if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
        return state();
      case 'forward':
        if (wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
        return state();
      case 'reload':
        wc.reload();
        return state();
      case 'snapshot':
        return {
          ...state(),
          text: await wc.executeJavaScriptInIsolatedWorld(1001, [
            { code: '(document.body?.innerText || "").slice(0, 16000)' },
          ]),
        };
      case 'screenshot': {
        if (!wc.getURL() || wc.getURL() === 'about:blank') throw new Error('Open a page in Browser first.');
        // Request a fresh compositor frame even if the tab has never been shown.
        if (!wc.debugger.isAttached()) wc.debugger.attach();
        const { data } = await wc.debugger.sendCommand('Page.captureScreenshot', {
          format: 'jpeg', quality: 80, fromSurface: true,
        });
        return { mime: 'image/jpeg', data: Buffer.from(data, 'base64') };
      }
      case 'tab_audio':
        if (entry.recording) throw new Error('Tab audio capture is already running.');
        entry.recording = true;
        try {
          return { mime: 'audio/wav', data: await recordTab(wc, args.seconds) };
        } finally {
          entry.recording = false;
        }
      case 'click': {
        const { x, y } = args;
        const { width, height } = entry.view.getBounds();
        const zoom = wc.getZoomFactor();
        const point = { x: Math.round(x * zoom), y: Math.round(y * zoom) };
        if (![x, y].every((n) => Number.isInteger(n) && n >= 0) || point.x >= width || point.y >= height) {
          throw new Error('Click coordinates must be inside the Browser viewport.');
        }
        wc.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
        wc.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point });
        return state();
      }
      case 'type_text':
        if (typeof args.text !== 'string') throw new Error('Expected text.');
        await wc.insertText(args.text);
        return state();
      default:
        throw new Error('Unknown Browser action.');
    }
  }
  async function start() {
    server = http.createServer(async (req, res) => {
      if (req.headers.origin || req.headers.authorization !== 'Bearer ' + key || req.method !== 'POST') {
        res.writeHead(403).end();
        return;
      }
      try {
        const [, id, name] = req.url.split('/');
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 65536) throw new Error('Browser request too large.');
          chunks.push(chunk);
        }
        const result = await action(id, name, JSON.parse(Buffer.concat(chunks).toString('utf8')));
        res
          .writeHead(200, { 'Content-Type': result.mime || 'application/json' })
          .end(result.data || JSON.stringify(result));
      } catch (err) {
        res.writeHead(400).end(err.message);
      }
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    fs.mkdirSync(path.dirname(endpointFile), { recursive: true, mode: 0o700 });
    const pending = endpointFile + '.' + randomUUID();
    try {
      fs.writeFileSync(pending, JSON.stringify({ port, key }), { flag: 'wx', mode: 0o600 });
      fs.renameSync(pending, endpointFile);
    } finally {
      fs.rmSync(pending, { force: true });
    }
    return port;
  }
  return {
    start,
    mount,
    hide,
    layout,
    action,
    close,
    stop() {
      close();
      server?.close();
      server?.closeAllConnections();
      try {
        if (JSON.parse(fs.readFileSync(endpointFile, 'utf8')).key === key) fs.unlinkSync(endpointFile);
      } catch (error) {
        if (error.code !== 'ENOENT') console.error('Browser endpoint cleanup:', error.message);
      }
    },
  };
}
