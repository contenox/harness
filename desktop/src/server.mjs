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

export async function startUiServer({ uiDir, runtimeOrigin }) {
  const proxy = httpProxy.createProxyServer({ target: runtimeOrigin, changeOrigin: true, ws: true });
  proxy.on('error', (error, _request, response) => {
    if (response && !response.headersSent) response.writeHead(502, { 'content-type': 'text/plain' });
    if (response) response.end(`runtime proxy error: ${error.message}`);
  });
  const server = http.createServer((request, response) => {
    if (request.url?.startsWith('/api') || request.url?.startsWith('/acp') || request.url?.startsWith('/ui')) {
      proxy.web(request, response);
      return;
    }
    const clean = decodeURIComponent((request.url || '/').split('?')[0]);
    const relative = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
    const candidate = path.resolve(uiDir, relative);
    if (!candidate.startsWith(path.resolve(uiDir) + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(uiDir, 'index.html');
    fs.readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      response.end(body);
    });
  });
  server.on('upgrade', (request, socket, head) => proxy.ws(request, socket, head));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    port: address.port,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}
