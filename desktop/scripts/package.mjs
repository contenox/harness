import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = process.argv.includes('--local');
const store = process.argv.includes('--store');
const windows = process.platform === 'win32';

if (store && !windows) {
  console.error('package:store builds an MSIX package and runs on Windows only.');
  process.exit(1);
}

const overrides = local
  ? {
      identityName: 'Contenox.Local',
      publisher: 'CN=Contenox Local',
      publisherDisplayName: 'Contenox',
    }
  : {
      identityName: process.env.MSSTORE_IDENTITY_NAME?.trim(),
      publisher: process.env.MSSTORE_PUBLISHER?.trim(),
      publisherDisplayName: process.env.MSSTORE_PUBLISHER_DISPLAY_NAME?.trim(),
    };

const args = ['--publish', 'never', '-c.electronDist=node_modules/electron/dist'];
if (windows) args.push('--config', 'electron-builder-windows.yml', '--x64');
if (store) {
  args.push('--win', 'appx');
  for (const [key, value] of Object.entries(overrides)) {
    if (value) args.push(`-c.appx.${key}=${value}`);
  }
}
args.push(...process.argv.slice(2).filter(arg => arg !== '--local' && arg !== '--store'));

const cli = path.join(desktop, 'node_modules', 'electron-builder', 'cli.js');
if (!windows) {
  execFileSync(process.execPath, [cli, ...args], { cwd: desktop, stdio: 'inherit' });
  process.exit(0);
}
const runtime = path.join(desktop, 'resources', 'runtime', 'contenox-runtime.exe');
const cache = path.resolve(desktop, '../.runtime');
fs.mkdirSync(cache, { recursive: true });
const staging = fs.mkdtempSync(path.join(cache, 'package-worker-'));
try {
  // Use the staged runtime's installer for its protocol check, checksum verification,
  // native DLL layout and licenses. The build gets its own empty model store.
  execFileSync(runtime, ['modeld', 'install', '--data-root', staging], { stdio: 'inherit' });
  const bundle = fs.readFileSync(path.join(staging, 'modeld', 'current'), 'utf8').trim();
  for (const file of ['modeld.cmd', 'modeld.exe', 'manifest.json', 'LICENSES/contenox-LICENSE']) {
    if (!fs.statSync(path.join(bundle, file)).isFile()) throw new Error(`Missing worker file: ${file}`);
  }
  execFileSync(process.execPath, [cli, ...args], {
    cwd: desktop, stdio: 'inherit',
    env: { ...process.env, CONTENOX_PACKAGE_WORKER_DIR: path.relative(desktop, bundle).split(path.sep).join('/') },
  });
} finally {
  fs.rmSync(staging, { recursive: true, force: true, maxRetries: 5 });
}
