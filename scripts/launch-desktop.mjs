#!/usr/bin/env node
// Launches the unpacked desktop build from desktop/dist (made by package-dir or
// package-local) and returns right away.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'desktop', 'dist');

function candidates() {
  if (process.platform === 'win32') return [path.join(dist, 'win-unpacked', 'Contenox.exe')];
  if (process.platform === 'darwin') {
    return ['mac', 'mac-arm64', 'mac-universal'].map(dir => path.join(dist, dir, 'Contenox.app'));
  }
  return [path.join(dist, 'linux-unpacked', 'contenox')];
}

const app = candidates().find(file => fs.existsSync(file));
if (!app) {
  console.error(`No unpacked build in ${dist}. Run npm run package-local first.`);
  process.exit(1);
}

const [command, args] = process.platform === 'darwin' ? ['open', [app]] : [app, []];
const child = spawn(command, args, { detached: true, stdio: 'ignore' });
child.unref();
console.log(`launched ${app}`);
