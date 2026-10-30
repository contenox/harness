#!/usr/bin/env node
// Removes build output and the dev runtime download (`npm run clean`). Plain Node so it works the
// same from PowerShell, cmd and Unix shells (rm -rf does not exist in cmd.exe).
//
//   node scripts/clean.mjs [--dry-run] [--root <dir>]
//
// --dry-run only lists what would be removed; --root cleans another checkout-shaped directory
// (used to test this script).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const rootFlag = args.indexOf('--root');
const root = rootFlag >= 0 ? path.resolve(args[rootFlag + 1] ?? '') : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const targets = ['packages/ui/dist', 'packages/harness/dist', 'desktop/node_modules', '.runtime'].map(p => path.join(root, p));

let failed = false;
for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  console.log(`${dryRun ? 'would remove' : 'removing'} ${target}`);
  if (dryRun) continue;
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch (error) {
    failed = true;
    console.error(`could not remove ${target}: ${error.message}`);
  }
}
if (failed) {
  console.error('Close anything that has these folders open (editors, terminals, Contenox) and run it again.');
  process.exit(1);
}
