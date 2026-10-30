#!/usr/bin/env node
// Wipes the local Contenox desktop state so the next launch behaves like a fresh install.
// Dry run by default; pass --yes to stop running Contenox processes and delete.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findContenoxProcesses, repoRoot as root, report, stopProcesses } from './local-processes.mjs';

const home = os.homedir();
const confirmed = process.argv.includes('--yes');

function appDataDir() {
  if (process.platform === 'win32') return process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support');
  return process.env.XDG_CONFIG_HOME || path.join(home, '.config');
}

// Everything the desktop app creates on first launch.
const targets = [
  { path: path.join(appDataDir(), 'ContenoxHarness'), what: 'app data: database, runtime data, logs, window state, UI preferences' },
  { path: path.join(home, '.contenox-harness'), what: 'runtime home files: access token, chain file, sandbox settings' },
  { path: path.join(root, '.runtime', 'dev'), what: 'dev-mode state (npm run dev)' },
];

// Scratchpad folders (the default project) may hold the user's own files: only remove one when it
// holds nothing but what Contenox put there. Older installs used ~/Contenox.
const scratchpadFolders = [path.join(home, 'Contenox Scratchpad'), path.join(home, 'Contenox')];
const contenoxOnlyEntries = new Set(['.contenox']);

function describeScratchpads() {
  return scratchpadFolders
    .filter(dir => fs.existsSync(dir))
    .map(dir => {
      const foreign = fs.readdirSync(dir).filter(entry => !contenoxOnlyEntries.has(entry));
      return { dir, removable: foreign.length === 0, foreign };
    });
}

// The app, its runtimes and repo dev servers hold these files open; stop them first.
const running = findContenoxProcesses('all');
report(running, { verb: confirmed ? 'Stopping' : 'Would stop' });
if (confirmed && running.length > 0) {
  const failed = stopProcesses(running);
  for (const { proc, error } of failed) console.error(`  could not stop ${proc.pid} (${proc.name}): ${error.message}`);
  if (failed.length > 0) process.exit(1);
  await new Promise(resolve => setTimeout(resolve, 1000));
}

const existing = targets.filter(t => fs.existsSync(t.path));
const scratchpads = describeScratchpads();
const removable = scratchpads.filter(s => s.removable);

console.log(confirmed ? 'Deleting local Contenox state:' : 'Would delete (dry run, run: npm run reset-local-state -- --yes):');
if (existing.length === 0 && removable.length === 0) console.log('  nothing to delete, already clean');
for (const t of existing) console.log(`  ${t.path}\n      ${t.what}`);
for (const s of removable) console.log(`  ${s.dir}\n      scratchpad folder (empty or only Contenox's marker)`);
for (const s of scratchpads.filter(s => !s.removable)) {
  console.log(`Keeping ${s.dir}: it contains your files (${s.foreign.slice(0, 5).join(', ')}${s.foreign.length > 5 ? ', …' : ''}).`);
}
console.log('Not touched: the runtime CLI state used by editors (e.g. ~/.contenox), project markers inside your project folders, the update cache.');

if (!confirmed) process.exit(0);

let failed = false;
const remove = target => {
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch (error) {
    failed = true;
    console.error(`  could not delete ${target}: ${error.message}`);
  }
};
for (const t of existing) remove(t.path);
for (const s of removable) remove(s.dir);

if (failed) {
  console.error('Some files could not be deleted. Close Contenox and anything that has these folders open, then run it again.');
  process.exit(1);
}
console.log('Done. The next launch starts like a fresh install.');
