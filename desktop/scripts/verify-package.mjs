import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
