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

const RUNTIME_PREFIX = /^\/(api|acp|ui)(\/|$|\?)/;





export async function startUiServer({ uiDir, runtimeOrigin, port = 0 }) {
  const target = { origin: runtimeOrigin };
  const proxy = httpProxy.createProxyServer({ target: runtimeOrigin, changeOrigin: true, ws: true });

  proxy.on('proxyReq', proxyReq => {
    proxyReq.setHeader('origin', new URL(target.origin).origin);
  });
  proxy.on('error', (error, _request, response) => {
    if (response && !response.headersSent) response.writeHead(503, { 'content-type': 'text/plain' });
    if (response) response.end(`runtime unavailable: ${error.message}`);
  });

  const server = http.createServer((request, response) => {
    if (RUNTIME_PREFIX.test(request.url || '')) {
      proxy.web(request, response, { target: target.origin });
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

  server.on('upgrade', (request, socket, head) => proxy.ws(request, socket, head, { target: target.origin }));

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  return {
    port: server.address().port,
    setRuntimeOrigin(origin) {
      target.origin = origin;
    },
    close: () => new Promise(resolve => server.close(resolve)),
  };
}
