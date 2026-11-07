import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = process.argv.includes('--local');

if (process.platform !== 'win32') {
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

const args = ['--win', 'appx', '--x64', '--publish', 'never', '-c.electronDist=node_modules/electron/dist'];
for (const [key, value] of Object.entries(overrides)) {
  if (value) args.push(`-c.appx.${key}=${value}`);
}

const cli = path.join(desktop, 'node_modules', 'electron-builder', 'cli.js');
const result = spawnSync(process.execPath, [cli, ...args], { cwd: desktop, stdio: 'inherit' });
process.exit(result.status ?? 1);
