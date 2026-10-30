import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(desktop, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'runtime.lock.json'), 'utf8'));
const platform = { linux: 'linux', darwin: 'darwin', win32: 'windows' }[process.platform];
const arch = { x64: 'amd64', arm64: 'arm64' }[process.arch];
if (!platform || !arch) throw new Error(`unsupported host ${process.platform}/${process.arch}`);
const suffix = platform === 'windows' ? '.exe' : '';
// `--runtime <path>` stages that runtime binary instead of the pinned release; an empty
// `--runtime ""` stages the contenox-runtime found on PATH (a dev install).
function runtimeOnPath() {
  const names = platform === 'windows' ? ['contenox-runtime.exe'] : ['contenox-runtime'];
  for (const dir of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}
const runtimeArg = process.argv.indexOf('--runtime');
const requested = runtimeArg > -1 ? (process.argv[runtimeArg + 1] ?? '').trim() : null;
let localRuntime = null;
if (requested !== null) {
  localRuntime = requested ? path.resolve(requested) : runtimeOnPath();
  if (!localRuntime) {
    throw new Error(
      'no contenox-runtime on PATH. Put a development build of contenox-runtime on PATH or pass RUNTIME_BIN=<path to contenox-runtime>.',
    );
  }
}
const source =
  localRuntime ?? path.join(root, '.runtime', lock.version, `contenox-runtime-${platform}-${arch}${suffix}`);
if (!fs.existsSync(source)) {
  throw new Error(`missing runtime: ${source}; ${localRuntime ? 'check RUNTIME_BIN' : 'run npm run runtime-fetch'}`);
}
const runtime = path.join(desktop, 'resources', 'runtime');
const ui = path.join(desktop, 'resources', 'ui');
fs.rmSync(runtime, { recursive: true, force: true });
fs.rmSync(ui, { recursive: true, force: true });
fs.mkdirSync(runtime, { recursive: true });
fs.copyFileSync(source, path.join(runtime, `contenox-runtime${suffix}`));
if (platform !== 'windows') fs.chmodSync(path.join(runtime, `contenox-runtime${suffix}`), 0o755);
fs.cpSync(path.join(root, 'packages', 'harness', 'dist'), ui, { recursive: true });
console.log(`staged runtime ${localRuntime ? `from ${localRuntime}` : lock.version} and harness UI`);
