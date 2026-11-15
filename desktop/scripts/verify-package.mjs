import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { freePort } from '../src/server.mjs';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(desktop, 'dist');
const suffix = process.platform === 'darwin' ? path.join('mac-arm64', 'Contenox.app', 'Contents', 'Resources')
  : process.platform === 'win32' ? path.join('win-unpacked', 'resources')
  : path.join('linux-unpacked', 'resources');
const resources = path.join(dist, suffix);
const runtime = path.join(resources, 'runtime', process.platform === 'win32' ? 'contenox-runtime.exe' : 'contenox-runtime');
const ui = path.join(resources, 'ui', 'index.html');
const asar = path.join(resources, 'app.asar');
for (const file of [runtime, ui, asar]) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
}
const version = execFileSync(runtime, ['version'], { encoding: 'utf8' }).trim();
console.log(version);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'contenox-package-'));
try {
  const port = await freePort();
  const env = {
    ...process.env, HOME: profile, USERPROFILE: profile,
    APPDATA: path.join(profile, 'roaming'), LOCALAPPDATA: path.join(profile, 'local'),
    ADDR: '127.0.0.1', PORT: String(port), TOKEN: '', CONTENOX_UPDATE_CHECK: 'false',
  };
  const project = path.join(profile, 'project');
  fs.mkdirSync(project);
  const child = spawn(runtime, ['--db', path.join(profile, 'local.db'), 'serve', project], {
    cwd: project, env, windowsHide: true, stdio: 'ignore',
  });
  const closed = once(child, 'close');
  closed.catch(() => {});
  try {
    const origin = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 60_000;
    while (true) {
      if (child.exitCode !== null || child.signalCode) throw new Error('Packaged runtime exited before becoming healthy');
      if ((await fetch(origin + '/health', { signal: AbortSignal.timeout(1500) }).catch(() => null))?.ok) break;
      if (Date.now() >= deadline) throw new Error('Packaged runtime did not become healthy');
      await delay(150);
    }
    const response = await fetch(origin + '/api/workspace/schedules/interval?every=1h', { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200, 'packaged runtime must support interval validation');
    const { next } = await response.json();
    assert.ok(Date.parse(next) > Date.now(), 'interval validation must return a future firing time');
    console.log('Bundled runtime validated a one-hour schedule.');
  } finally {
    child.kill();
    await closed;
  }
} finally {
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}
