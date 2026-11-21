import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import httpProxy from 'http-proxy';

// https://fetch.spec.whatwg.org/#port-blocking
// A customized OS ephemeral range can include ports Chromium and fetch refuse.
const blockedPorts = new Set([
  0, 1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53,
  69, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117,
  119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514,
  515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989,
  990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061,
  6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080,
]);

async function listenLoopback(server, preferred = 0) {
  let port = blockedPorts.has(preferred) ? 0 : preferred;
  for (let attempt = 0; attempt < 32; attempt++) {
    await new Promise((resolve, reject) => {
      const onError = error => { server.off('listening', onListening); reject(error); };
      const onListening = () => { server.off('error', onError); resolve(); };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, '127.0.0.1');
    });
    if (!blockedPorts.has(server.address().port)) return;
    await new Promise(resolve => server.close(resolve));
    port = 0;
  }
  throw new Error('could not allocate a browser-accessible loopback port');
}

export async function freePort() {
  const server = net.createServer();
  await listenLoopback(server);
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};

const RUNTIME_PATH = /^\/(api|acp|ui)(\/|$|\?)/;
const PROJECT_PATH = /^\/rt\/([A-Za-z0-9_-]{1,64})(\/(?:api|acp|ui)(?:\/|$|\?).*)$/s;

// Split a request URL into its routing parts.
// -> { key: null|string, url } for runtime traffic (url has any /rt/<key> prefix stripped), or null for static files.
export function routeRuntimePath(rawUrl) {
  const url = rawUrl || "/";
  if (RUNTIME_PATH.test(url)) return { key: null, url };
  const match = PROJECT_PATH.exec(url);
  if (match) return { key: match[1], url: match[2] };
  if (url.startsWith("/rt/")) return { key: url.split("/")[2] || "", url: null };
  return null;
}

/**
 * Local UI server: static React bundle + reverse proxy to runtime instances.
 *
 * resolveTarget(key|null) -> origin|null. key === null is the default instance (unprefixed paths),
 * otherwise the project key from /rt/<key>/... . onActivity(key) is called for each proxied request
 * when a proxied websocket opens and when it closes (key is null for the default instance). Open websockets are
 * reported via openWebSockets(key) so the supervisor can treat them as in use.
 */
export async function startUiServer({ uiDir, resolveTarget, onActivity = () => {}, port = 0 }) {
  const proxy = httpProxy.createProxyServer({ changeOrigin: true, ws: true });
  const sockets = new Set();
  const wsCounts = new Map();

  proxy.on("proxyReq", (proxyReq, request, response, options) => {
    const target = options?.target;
    const origin = typeof target === "string" ? target : target?.href;
    if (origin) proxyReq.setHeader("origin", new URL(origin).origin);
    // A render can run long after its request body has been sent.
    if (request.method === 'POST' && request.url.split('?')[0] === '/api/workspace/media/render') {
      response.once('close', () => {
        if (!response.writableFinished) proxyReq.destroy();
      });
    }
  });
  proxy.on("proxyReqWs", (proxyReq, _req, _socket, options) => {
    const target = options?.target;
    const origin = typeof target === "string" ? target : target?.href;
    if (origin) proxyReq.setHeader("origin", new URL(origin).origin);
  });
  // For websockets http-proxy passes the raw socket instead of a ServerResponse.
  proxy.on("error", (error, _request, response) => {
    if (!response) return;
    if (typeof response.writeHead !== "function") {
      try { response.destroy(); } catch {}
      return;
    }
    if (!response.headersSent) response.writeHead(503, { "content-type": "text/plain" });
    response.end(`runtime unavailable: ${error.message}`);
  });

  const server = http.createServer((request, response) => {
    const route = routeRuntimePath(request.url);
    if (route) {
      const origin = route.url ? resolveTarget(route.key) : null;
      if (!origin) {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "runtime_not_running", key: route.key }));
        return;
      }
      onActivity(route.key);
      request.url = route.url;
      proxy.web(request, response, { target: origin });
      return;
    }
    let clean;
    try {
      clean = decodeURIComponent((request.url || '/').split('?')[0]);
    } catch {
      response.writeHead(400, { 'content-type': 'text/plain' }).end('bad request');
      return;
    }
    const relative = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
    const root = path.resolve(uiDir);
    const candidate = path.resolve(root, relative);
    if (candidate !== root && !candidate.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
    fs.readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        'content-type': types[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'no-cache',
      });
      response.end(body);
    });
  });

  server.on("connection", socket => {
    sockets.add(socket);
    socket.on("error", () => {});
    socket.once("close", () => sockets.delete(socket));
  });

  server.on("upgrade", (request, socket, head) => {
    socket.on("error", () => socket.destroy());
    const route = routeRuntimePath(request.url);
    const origin = route && route.url ? resolveTarget(route.key) : null;
    if (!route || !origin) {
      socket.destroy();
      return;
    }
    const counter = route.key ?? "";
    wsCounts.set(counter, (wsCounts.get(counter) ?? 0) + 1);
    socket.once("close", () => {
      wsCounts.set(counter, Math.max(0, (wsCounts.get(counter) ?? 1) - 1));
      onActivity(route.key);
    });
    onActivity(route.key);
    request.url = route.url;
    proxy.ws(request, socket, head, { target: origin });
  });

  await listenLoopback(server, port);

  return {
    port: server.address().port,
    // Number of open websockets proxied for a project key (null = default instance).
    openWebSockets: key => wsCounts.get(key ?? "") ?? 0,
    close: () =>
      new Promise(resolve => {
        server.close(() => resolve());
        for (const socket of sockets) socket.destroy();
        sockets.clear();
      }),
  };
}
