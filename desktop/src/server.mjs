import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import httpProxy from 'http-proxy';

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
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

  proxy.on("proxyReq", (proxyReq, _req, _res, options) => {
    const target = options?.target;
    const origin = typeof target === "string" ? target : target?.href;
    if (origin) proxyReq.setHeader("origin", new URL(origin).origin);
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

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

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
