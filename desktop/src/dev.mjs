import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const electron = require('electron');
const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(desktop, '..');
const state = path.join(root, '.runtime', 'dev');
const harness = path.join(root, 'packages', 'harness');
const port = 32123;
const children = new Set();

function run(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  children.add(child);
  child.on('error', error => console.error(`${command}: ${error.message}`));
  child.on('exit', () => children.delete(child));
  return child;
}

function stop() {
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch {}
  }
}
process.on('SIGINT', () => { stop(); process.exit(130); });
process.on('SIGTERM', () => { stop(); process.exit(143); });
// Any other way out (an error during startup included) must not leave the runtime or Vite running.
process.on('exit', stop);

async function wait(url, label) {
  for (let i = 0; i < 240; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not become ready at ${url}`);
}

fs.mkdirSync(path.join(state, 'home'), { recursive: true });
fs.mkdirSync(path.join(state, 'workspace'), { recursive: true });
// RUNTIME_BIN (e.g. a dev-installed contenox-runtime) overrides the pinned release.
const binary = process.env.RUNTIME_BIN?.trim()
  ? path.resolve(process.env.RUNTIME_BIN.trim())
  : execFileSync(process.execPath, [path.join(root, 'scripts', 'fetch-runtime.mjs'), '--print-path'], { encoding: 'utf8' });
if (!fs.existsSync(binary)) throw new Error(`runtime not found: ${binary}`);
const home = path.join(state, 'home');
const data = path.join(state, 'workspace', '.contenox');
const db = path.join(home, '.contenox', 'local.db');
const env = { ...process.env, HOME: home, ADDR: '127.0.0.1', PORT: String(port) };

execFileSync(binary, ['--data-dir', data, '--db', db, 'init', '--force'], { env, stdio: 'ignore' });
console.error(`runtime: ${binary}`);
const runtime = run(binary, ['--data-dir', data, '--db', db, 'serve'], { env });
runtime.on('exit', code => {
  console.error(`runtime exited with ${code}`);
  stop();
  process.exit(code ?? 1);
});
await wait(`http://127.0.0.1:${port}/health`, 'runtime');

console.error('vite: http://127.0.0.1:5173');
// Run Vite's own entry with this Node binary: spawning `npm` fails on Windows (npm is npm.cmd),
// and going through a shell would bring back per-platform quoting.
const vitePkgPath = require.resolve('vite/package.json', { paths: [harness] });
const vitePkg = JSON.parse(fs.readFileSync(vitePkgPath, 'utf8'));
const viteBin = path.join(path.dirname(vitePkgPath), typeof vitePkg.bin === 'string' ? vitePkg.bin : vitePkg.bin.vite);
const vite = run(process.execPath, [viteBin, '--mode', 'proxy', '--port', '5173', '--host', '127.0.0.1', '--strictPort'], {
  cwd: harness,
  env: { ...process.env, VITE_DEV_API_PROXY: '1', VITE_DEV_PROXY_TARGET: `http://127.0.0.1:${port}` },
});
vite.on('exit', code => {
  console.error(`vite exited with ${code}`);
  stop();
  process.exit(code ?? 1);
});
await wait('http://127.0.0.1:5173', 'Vite');

console.error('electron: starting');
const window = run(electron, [desktop], {
  env: { ...process.env, CONTENOX_DEV_URL: 'http://127.0.0.1:5173' },
});
window.on('exit', code => {
  stop();
  process.exit(code ?? 0);
});
