import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { startUiServer } from '../src/server.mjs';

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

function fakeRuntime(name) {
  return listen((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200).end('ok');
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ runtime: name }));
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
  const ui = await startUiServer({ uiDir, runtimeOrigin: a.origin, port: 0 });
  try {
    await fn({ ui, a, b, uiDir });
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

test('proxies runtime paths and follows a re-pointed runtime', async () => {
  await withServer(async ({ ui, b }) => {
    const first = await fetch(`http://127.0.0.1:${ui.port}/api/whoami`);
    assert.deepEqual(await first.json(), { runtime: 'A' });

    ui.setRuntimeOrigin(b.origin);
    const second = await fetch(`http://127.0.0.1:${ui.port}/api/whoami`);
    assert.deepEqual(await second.json(), { runtime: 'B' });
  });
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
  const first = await startUiServer({ uiDir, runtimeOrigin: a.origin, port: 0 });
  const port = first.port;
  await first.close();

  const second = await startUiServer({ uiDir, runtimeOrigin: a.origin, port });
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
  const first = await startUiServer({ uiDir, runtimeOrigin: a.origin, port: 0 });
  try {
    await assert.rejects(
      startUiServer({ uiDir, runtimeOrigin: a.origin, port: first.port }),
      error => error.code === 'EADDRINUSE',
    );
  } finally {
    await first.close();
    a.server.close();
  }
});
