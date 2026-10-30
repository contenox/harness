import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import net from 'node:net';
import { routeRuntimePath, startUiServer } from '../src/server.mjs';

function listen(handler) {
  return new Promise(resolve => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` });
    });
  });
}



function rawGet(port, rawPath) {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, path: rawPath, method: 'GET' }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    request.on('error', reject);
    request.end();
  });
}

function upgradeRequest(p) {
  return [`GET ${p} HTTP/1.1`, 'Host: x', 'Connection: Upgrade', 'Upgrade: websocket', 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version: 13', '', ''].join('\r\n');
}

function fakeRuntime(name) {
  return listen((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200).end('ok');
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ runtime: name, url: request.url, origin: request.headers.origin }));
  });
}

function uiFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contenox-ui-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>index</title>');
  fs.writeFileSync(path.join(dir, 'app.js'), 'console.log("app")');
  return dir;
}

async function withServer(fn) {
  const a = await fakeRuntime('A');
  const b = await fakeRuntime('B');
  const uiDir = uiFixture();
  const origins = { default: a.origin, abc123: b.origin };
  const activity = [];
  const ui = await startUiServer({
    uiDir,
    resolveTarget: key => origins[key ?? 'default'] ?? null,
    onActivity: key => activity.push(key),
    port: 0,
  });
  try {
    await fn({ ui, a, b, uiDir, origins, activity });
  } finally {
    await ui.close();
    a.server.close();
    b.server.close();
  }
}

test('serves index.html at / and assets with a type', async () => {
  await withServer(async ({ ui }) => {
    const index = await fetch(`http://127.0.0.1:${ui.port}/`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /<title>index<\/title>/);

    const asset = await fetch(`http://127.0.0.1:${ui.port}/app.js`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('content-type'), 'text/javascript; charset=utf-8');
  });
});

test('unprefixed paths go to the default runtime, prefixed paths to their project runtime', async () => {
  await withServer(async ({ ui, a, b, activity }) => {
    const first = await (await fetch(`http://127.0.0.1:${ui.port}/api/whoami?x=1`)).json();
    assert.equal(first.runtime, 'A');
    assert.equal(first.url, '/api/whoami?x=1');
    assert.equal(first.origin, a.origin);

    const second = await (await fetch(`http://127.0.0.1:${ui.port}/rt/abc123/api/whoami?x=2`)).json();
    assert.equal(second.runtime, 'B');
    assert.equal(second.url, '/api/whoami?x=2'); // prefix stripped
    assert.equal(second.origin, b.origin);

    const ui3 = await (await fetch(`http://127.0.0.1:${ui.port}/rt/abc123/ui/x`)).json();
    assert.equal(ui3.url, '/ui/x');
    assert.ok(activity.includes('abc123'));
    assert.ok(activity.includes(null));
  });
});

test('resolver changes are followed', async () => {
  await withServer(async ({ ui, b, origins }) => {
    origins.default = b.origin;
    const result = await (await fetch(`http://127.0.0.1:${ui.port}/api/whoami`)).json();
    assert.equal(result.runtime, 'B');
  });
});

test('an unknown project key answers 503 runtime_not_running', async () => {
  await withServer(async ({ ui }) => {
    const response = await fetch(`http://127.0.0.1:${ui.port}/rt/nope/api/whoami`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'runtime_not_running', key: 'nope' });
  });
});

test('/rt/<key>/ without a runtime path is not served as a static file', async () => {
  await withServer(async ({ ui }) => {
    const response = await fetch(`http://127.0.0.1:${ui.port}/rt/abc123/other`);
    assert.equal(response.status, 503);
  });
});

test('routeRuntimePath', () => {
  assert.deepEqual(routeRuntimePath('/api/x'), { key: null, url: '/api/x' });
  assert.deepEqual(routeRuntimePath('/rt/k1/acp?a=b'), { key: 'k1', url: '/acp?a=b' });
  assert.equal(routeRuntimePath('/apifoo'), null);
  assert.equal(routeRuntimePath('/index.html'), null);
});

test('websocket upgrades for an unknown key are destroyed', async () => {
  await withServer(async ({ ui }) => {
    const socket = net.connect(ui.port, '127.0.0.1');
    socket.write(upgradeRequest('/rt/nope/acp'));
    await new Promise(resolve => { socket.on('close', resolve); socket.on('error', () => {}); });
  });
});

test('a websocket to a dead upstream does not throw and the socket is closed', async () => {
  const dead = await fakeRuntime('dead');
  const deadOrigin = dead.origin;
  dead.server.close();
  const uiDir = uiFixture();
  const ui = await startUiServer({ uiDir, resolveTarget: () => deadOrigin, port: 0 });
  const uncaught = [];
  const onUncaught = error => uncaught.push(error);
  process.on('uncaughtException', onUncaught);
  try {
    const socket = net.connect(ui.port, '127.0.0.1');
    socket.write(upgradeRequest('/acp'));
    await new Promise(resolve => { socket.on('close', resolve); socket.on('error', () => {}); });
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.deepEqual(uncaught, []);
  } finally {
    process.off('uncaughtException', onUncaught);
    await ui.close();
  }
});

test('close() resolves promptly even with an open (idle keep-alive) socket', async () => {
  const a = await fakeRuntime('A');
  const uiDir = uiFixture();
  const ui = await startUiServer({ uiDir, resolveTarget: () => a.origin, port: 0 });
  const socket = net.connect(ui.port, '127.0.0.1');
  await new Promise(resolve => socket.once('connect', resolve));
  socket.on('error', () => {});
  const closed = await Promise.race([
    ui.close().then(() => 'closed'),
    new Promise(resolve => setTimeout(() => resolve('timeout'), 2000)),
  ]);
  assert.equal(closed, 'closed');
  a.server.close();
});

test('/apifoo is not treated as an api path', async () => {
  await withServer(async ({ ui }) => {
    const response = await fetch(`http://127.0.0.1:${ui.port}/apifoo`);
    assert.match(await response.text(), /<title>index<\/title>/);
  });
});

test('a malformed percent escape is a 400, not a crash', async () => {
  await withServer(async ({ ui }) => {
    const bad = await rawGet(ui.port, '/%E0%A4%A');
    assert.equal(bad.status, 400);

    const after = await fetch(`http://127.0.0.1:${ui.port}/`);
    assert.equal(after.status, 200);
  });
});

test('a traversal attempt cannot leave the ui directory', async () => {
  await withServer(async ({ ui, uiDir }) => {
    fs.writeFileSync(path.join(path.dirname(uiDir), 'secret.txt'), 'secret');
    const response = await rawGet(ui.port, '/%2e%2e/secret.txt');
    assert.equal(response.status, 403);
  });
});

test('the same port can be requested and reported back', async () => {
  const a = await fakeRuntime('A');
  const uiDir = uiFixture();
  const first = await startUiServer({ uiDir, resolveTarget: () => a.origin, port: 0 });
  const port = first.port;
  await first.close();

  const second = await startUiServer({ uiDir, resolveTarget: () => a.origin, port });
  try {
    assert.equal(second.port, port);
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
  } finally {
    await second.close();
    a.server.close();
  }
});

test('a busy port rejects with EADDRINUSE', async () => {
  const a = await fakeRuntime('A');
  const uiDir = uiFixture();
  const first = await startUiServer({ uiDir, resolveTarget: () => a.origin, port: 0 });
  try {
    await assert.rejects(
      startUiServer({ uiDir, resolveTarget: () => a.origin, port: first.port }),
      error => error.code === 'EADDRINUSE',
    );
  } finally {
    await first.close();
    a.server.close();
  }
});
