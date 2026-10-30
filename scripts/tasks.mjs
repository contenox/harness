#!/usr/bin/env node
// Task runner behind `npm run <task>` (and the thin Makefile). Dependency-free Node, so the same
// commands work in PowerShell, cmd and POSIX shells without installing make.
//
//   node scripts/tasks.mjs <task>... [--runtime-bin=<path>] [--yes] [--dry-run] [--plan]
//
// Under npm, flags go after `--`:  npm run qa -- --runtime-bin=<path>
//
// Each step runs once per invocation. Children are started without a shell: npm is run through
// its JS entry (npm-cli.js) with the current Node, everything else through process.execPath.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => path.join(root, ...parts);

// ---------------------------------------------------------------- help

const HELP = `Usage: npm run <task> [-- <flags>]      (or: node scripts/tasks.mjs <task> [flags])

Everyday
  setup              npm ci for the web packages and the desktop shell (always reinstalls; make install is the same)
  dev                hot-reload sandbox: Vite UI in an Electron window + one runtime with throwaway state
                     in .runtime/dev (no per-project runtimes, not your real data). --runtime-bin=<path> for
                     another runtime. Builds the UI library first; after editing packages/ui run npm run build-ui
  build              build the UI library and the harness UI
  test               unit tests of ui library, harness and acp-client
                     [Storybook tests: npm run test:stories in packages/ui]
  typecheck          tsc for the harness app only
  lint               eslint for the harness app only
  ci                 install-web, build, typecheck, lint, test (what CI runs)

Packaging and QA
  package-dir        unpacked desktop app in desktop/dist with the pinned runtime, then verify
  package            host installers with the pinned runtime, then verify and write SHA256SUMS
  package-local      unpacked desktop app bundling contenox-runtime from PATH (or --runtime-bin)
  qa                 package-local, then launch the packaged app
                     npm run qa -- --runtime-bin=<path-to-contenox-runtime>
  runtime-fetch      download and verify the pinned runtime (runtime.lock.json); offline-safe when cached

Maintenance
  stop               stop dev servers, dev builds and runtimes started from this checkout
                     npm run stop -- --dry-run  only lists them
  clean              delete build output, desktop/node_modules, downloaded runtimes and dev-mode state (.runtime)
                     (--dry-run only lists)
  reset-local-state  wipe local app state for a fresh-install test (dry run; npm run reset-local-state -- --yes deletes)

CI-internal
  stage              build, fetch the pinned runtime and stage runtime + harness UI for packaging
  stage-local        build and stage contenox-runtime from PATH (or --runtime-bin) for packaging
  verify             smoke-check the unpacked package (prints the bundled runtime version)
  checksums          write SHA256SUMS for the host installers
  sign-rpm           sign Linux .rpm packages (Linux only, needs sh and GnuPG)
  install-web        npm ci for packages/ui, packages/harness and packages/acp-client (always reinstalls)
  install-desktop    npm ci and the Electron binary for desktop/ (always reinstalls)
  build-ui, build-harness, test-ui, test-harness, test-acp-client   single parts of build and test

Flags (after -- when run through npm)
  --runtime-bin=<path>  runtime binary for dev, stage-local, package-local and qa (env RUNTIME_BIN also works)
  --yes                 reset-local-state: actually delete
  --dry-run             stop, clean, reset-local-state: only list
  --plan                print the steps that would run, run nothing

Dependencies are installed with npm ci only when node_modules/.make-installed is missing or older
than package.json / package-lock.json.
`;

// ---------------------------------------------------------------- options

const DEPRECATED = {
  'desktop-install': 'install-desktop',
  'desktop-dev': 'dev',
  'desktop-stage': 'stage',
  'desktop-stage-local': 'stage-local',
  'desktop-package-dir': 'package-dir',
  'desktop-package': 'package',
  'desktop-package-local': 'package-local',
  'desktop-verify': 'verify',
  'desktop-checksums': 'checksums',
  'desktop-sign-rpm': 'sign-rpm',
};

const opts = { runtimeBin: process.env.RUNTIME_BIN?.trim() || '', yes: false, dryRun: false, plan: false };
const requested = [];
{
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--yes') opts.yes = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--plan') opts.plan = true;
    else if (arg === '--runtime-bin') opts.runtimeBin = (args[++i] ?? '').trim();
    else if (arg.startsWith('--runtime-bin=')) opts.runtimeBin = arg.slice('--runtime-bin='.length).trim();
    else if (arg.startsWith('-')) fail(`unknown option ${arg} (see: npm run help)`);
    else requested.push(arg);
  }
  if (opts.runtimeBin) opts.runtimeBin = path.resolve(process.env.INIT_CWD || process.cwd(), opts.runtimeBin);
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

// ---------------------------------------------------------------- spawning

if (!process.env.NODE_OPTIONS) process.env.NODE_OPTIONS = '--max-old-space-size=4096';

function npmCli() {
  const candidates = [];
  const exec = process.env.npm_execpath;
  if (exec && /npm-cli\.[cm]?js$/.test(exec)) candidates.push(exec);
  const nodeDir = path.dirname(process.execPath);
  candidates.push(
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  );
  const found = candidates.find(file => fs.existsSync(file));
  if (!found) {
    fail(`could not find npm-cli.js (looked in ${candidates.join(', ')}). Run through npm (npm run <task>) or install Node with npm.`);
  }
  return found;
}

const shown = args => args.map(a => (/\s/.test(a) ? `"${a}"` : a)).join(' ');

function start(file, args, { cwd = root, env = {} } = {}) {
  return new Promise(resolve => {
    const child = spawn(file, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env }, shell: false });
    child.on('error', error => {
      console.error(`could not start ${file}: ${error.message}`);
      resolve(127);
    });
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

async function exec(label, file, args, options) {
  console.log(`▶ ${label}`);
  if (opts.plan) {
    console.log(`    ${path.basename(file) === path.basename(process.execPath) ? 'node' : file} ${shown(args.map(a => (path.isAbsolute(a) ? path.relative(root, a) || '.' : a)))}`);
    return;
  }
  const code = await start(file, args, options);
  if (code !== 0) fail(`step failed (exit ${code}): ${label}`, code);
}

const node = (label, script, args = [], options) => exec(label, process.execPath, [script, ...args], options);
const npm = (label, dir, args, options) => {
  const cli = opts.plan ? 'npm-cli.js' : npmCli();
  return exec(label, process.execPath, [cli, '--prefix', dir, ...args], options);
};

// ---------------------------------------------------------------- stamps

const stampOf = dir => at(dir, 'node_modules', '.make-installed');
const mtime = file => {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return null;
  }
};
function isStale(dir) {
  const stamp = mtime(stampOf(dir));
  if (stamp === null) return true;
  return ['package.json', 'package-lock.json'].some(f => (mtime(at(dir, f)) ?? 0) > stamp);
}
function writeStamp(dir) {
  if (opts.plan) return;
  fs.mkdirSync(path.dirname(stampOf(dir)), { recursive: true });
  fs.writeFileSync(stampOf(dir), '');
}

const WEB = ['packages/ui', 'packages/harness', 'packages/acp-client'];
const DESKTOP = 'desktop';

// ---------------------------------------------------------------- tasks

const done = new Map();
// Runs a task or internal step once per invocation.
function need(name) {
  if (!done.has(name)) {
    const fn = tasks[name];
    if (!fn) fail(`unknown task: ${name} (see: npm run help)`);
    done.set(name, fn());
  }
  return done.get(name);
}
const needAll = async (...names) => {
  for (const name of names) await need(name);
};

const stop = () => node('stop', at('scripts', 'local-processes.mjs'), ['--scope', 'repo', ...(opts.dryRun ? ['--dry-run'] : [])]);

async function ciWeb(dir) {
  await npm(`npm ci ${dir}`, at(dir), ['ci']);
  writeStamp(dir);
}
async function ciDesktop() {
  await npm('npm ci desktop', at(DESKTOP), ['ci']);
  await node('electron binary', at(DESKTOP, 'node_modules', 'electron', 'install.js'));
  writeStamp(DESKTOP);
}

// Reinstall only when missing/stale (the old stamp rules).
const ensureWeb = dir => async () => {
  if (isStale(dir)) {
    await need('stop');
    await ciWeb(dir);
  } else console.log(`▶ ${dir} dependencies up to date`);
};
const desktopRun = script => npm(`desktop: ${script}`, at(DESKTOP), ['run', script]);
const stageArgs = () => ['--runtime', opts.runtimeBin];

const tasks = {
  help: async () => process.stdout.write(HELP),
  stop,

  'install-web': async () => {
    await need('stop');
    for (const dir of WEB) {
      await ciWeb(dir);
      done.set(`ensure:${dir}`, Promise.resolve());
    }
  },
  'install-desktop': async () => {
    await need('stop');
    await ciDesktop();
    done.set('ensure:desktop', Promise.resolve());
  },
  install: () => needAll('install-web', 'install-desktop'),
  // `npm run install` would collide with npm's own install lifecycle script, so npm calls it setup.
  setup: () => need('install'),

  'ensure:packages/ui': ensureWeb('packages/ui'),
  'ensure:packages/harness': ensureWeb('packages/harness'),
  'ensure:packages/acp-client': ensureWeb('packages/acp-client'),
  'ensure:desktop': async () => {
    if (isStale(DESKTOP)) {
      await need('stop');
      await ciDesktop();
    } else console.log('▶ desktop dependencies up to date');
  },

  'build-ui': async () => {
    await need('ensure:packages/ui');
    await npm('build packages/ui', at('packages/ui'), ['run', 'build']);
  },
  'build-harness': async () => {
    await needAll('build-ui', 'ensure:packages/harness');
    await npm('build packages/harness', at('packages/harness'), ['run', 'build']);
  },
  build: () => needAll('build-ui', 'build-harness'),

  'test-ui': async () => {
    await need('ensure:packages/ui');
    await npm('test packages/ui', at('packages/ui'), ['test', '--', '--project', 'unit']);
  },
  'test-harness': async () => {
    await need('ensure:packages/harness');
    await npm('test packages/harness', at('packages/harness'), ['test']);
  },
  'test-acp-client': async () => {
    await need('ensure:packages/acp-client');
    await npm('test packages/acp-client', at('packages/acp-client'), ['test']);
  },
  test: () => needAll('test-ui', 'test-harness', 'test-acp-client'),
  typecheck: async () => {
    await need('ensure:packages/harness');
    await npm('typecheck packages/harness', at('packages/harness'), ['run', 'typecheck']);
  },
  lint: async () => {
    await need('ensure:packages/harness');
    await npm('lint packages/harness', at('packages/harness'), ['run', 'lint']);
  },
  ci: () => needAll('install-web', 'build', 'typecheck', 'lint', 'test'),

  'runtime-fetch': () => node('runtime-fetch', at('scripts', 'fetch-runtime.mjs')),

  // Hot-reload sandbox. Always runs stop first: it uses the fixed ports 5173 and 32123.
  dev: async () => {
    await need('stop');
    if (!opts.runtimeBin) await need('runtime-fetch');
    await needAll('build-ui', 'ensure:packages/harness', 'ensure:desktop');
    await npm('desktop: dev', at(DESKTOP), ['run', 'dev'], { env: { RUNTIME_BIN: opts.runtimeBin } });
  },

  stage: async () => {
    await needAll('stop', 'build', 'runtime-fetch', 'ensure:desktop');
    await desktopRun('stage');
  },
  verify: () => desktopRun('verify:package'),
  checksums: () => desktopRun('checksums'),
  'package-dir': async () => {
    await need('stage');
    await desktopRun('package:dir');
    await desktopRun('verify:package');
  },
  package: async () => {
    await need('stage');
    await desktopRun('package');
    await desktopRun('verify:package');
    await desktopRun('checksums');
  },

  'sign-rpm': async () => {
    if (process.platform !== 'linux') fail('sign-rpm runs on Linux only (needs sh and GnuPG)');
    await exec('sign-rpm', 'sh', [at('scripts', 'sign-rpm.sh'), 'desktop/dist']);
  },

  // Dev builds with an unreleased runtime: bundle contenox-runtime from PATH (or --runtime-bin).
  'stage-local': async () => {
    await needAll('stop', 'build', 'ensure:desktop');
    await node('stage runtime', at(DESKTOP, 'scripts', 'stage.mjs'), stageArgs());
  },
  'package-local': async () => {
    await need('stage-local');
    await desktopRun('package:dir:staged');
    await desktopRun('verify:package');
  },
  qa: async () => {
    await need('package-local');
    await node('launch packaged app', at('scripts', 'launch-desktop.mjs'));
  },

  clean: async () => {
    await need('stop');
    await node('clean', at('scripts', 'clean.mjs'), opts.dryRun ? ['--dry-run'] : []);
  },
  'reset-local-state': () => node('reset-local-state', at('scripts', 'reset-local-state.mjs'), opts.yes ? ['--yes'] : []),
};

// ---------------------------------------------------------------- main

const PUBLIC = Object.keys(tasks).filter(name => !name.startsWith('ensure:'));

if (requested.length === 0) requested.push('help');
for (const name of requested) {
  const target = DEPRECATED[name];
  if (target) console.error(`note: ${name} is deprecated, use ${target}`);
  const real = target ?? name;
  if (!PUBLIC.includes(real)) fail(`unknown task: ${name}\n\n${HELP}`);
  if (opts.plan && requested.length === 1) console.log(`plan for ${real} (nothing is run):`);
  await need(real);
}
