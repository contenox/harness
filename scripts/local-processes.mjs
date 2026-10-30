// Finds and stops local Contenox processes so npm run tasks don't trip over locked files
// (Windows refuses to delete or overwrite files that a running process has open).
//
// Scopes:
//   repo  processes started from this checkout: dev servers (Vite, Storybook), the Electron dev
//         app, and runtimes launched from the repo.
//   all   repo + the installed Contenox app + any running contenox-runtime (e.g. one Zed started).

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const isWindows = process.platform === 'win32';
const norm = value => (isWindows ? value.replace(/\\/g, '/').toLowerCase() : value);

function listProcesses() {
  if (isWindows) {
    const script =
      'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress';
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const rows = JSON.parse(out || '[]');
    return (Array.isArray(rows) ? rows : [rows]).map(row => ({
      pid: row.ProcessId,
      ppid: row.ParentProcessId,
      name: row.Name ?? '',
      cmd: row.CommandLine ?? '',
    }));
  }
  const out = execFileSync('ps', ['-axo', 'pid=,ppid=,comm=,args='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out
    .split('\n')
    .map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/))
    .filter(Boolean)
    .map(([, pid, ppid, comm, args]) => ({ pid: Number(pid), ppid: Number(ppid), name: path.basename(comm), cmd: args }));
}

// This script and the npm/shell chain that launched it must survive.
function ancestorsOf(pid, byPid) {
  const seen = new Set();
  let current = pid;
  while (current && !seen.has(current)) {
    seen.add(current);
    current = byPid.get(current)?.ppid;
  }
  return seen;
}

function describe(proc) {
  const cmd = proc.cmd.replace(/\s+/g, ' ').trim();
  return `${proc.pid}  ${proc.name}  ${cmd.length > 120 ? `${cmd.slice(0, 117)}...` : cmd}`;
}

export function findContenoxProcesses(scope = 'repo') {
  const all = listProcesses();
  const byPid = new Map(all.map(p => [p.pid, p]));
  const protectedPids = ancestorsOf(process.pid, byPid);
  const root = norm(repoRoot);

  return all.filter(proc => {
    if (protectedPids.has(proc.pid)) return false;
    const name = proc.name.toLowerCase().replace(/\.exe$/, '');
    const cmd = norm(proc.cmd);
    const fromRepo = cmd.includes(root);
    // contenox = the packaged dev build running from desktop/dist (it locks staged files).
    const devTool = ['node', 'electron', 'esbuild', 'contenox-runtime', 'contenox'].includes(name);
    if (fromRepo && devTool) return true;
    if (scope === 'all' && (name === 'contenox' || name === 'contenox-runtime')) return true;
    return false;
  });
}

export function stopProcesses(procs) {
  const failed = [];
  for (const proc of procs) {
    try {
      process.kill(proc.pid);
    } catch (error) {
      if (error.code !== 'ESRCH') failed.push({ proc, error });
    }
  }
  return failed;
}

export function report(procs, { verb }) {
  if (procs.length === 0) return;
  console.log(`${verb} ${procs.length} Contenox process${procs.length === 1 ? '' : 'es'}:`);
  for (const proc of procs) console.log(`  ${describe(proc)}`);
}

// CLI: node scripts/local-processes.mjs [--scope repo|all] [--dry-run]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const scopeArg = process.argv.indexOf('--scope');
  const scope = scopeArg > -1 ? process.argv[scopeArg + 1] : 'repo';
  const dryRun = process.argv.includes('--dry-run');
  let procs;
  try {
    procs = findContenoxProcesses(scope);
  } catch (error) {
    console.error(`Could not list processes: ${error.message}`);
    process.exit(1);
  }
  if (procs.length === 0) {
    console.log('No running Contenox processes from this checkout.');
    process.exit(0);
  }
  report(procs, { verb: dryRun ? 'Would stop' : 'Stopping' });
  if (dryRun) process.exit(0);
  const failed = stopProcesses(procs);
  for (const { proc, error } of failed) console.error(`  could not stop ${proc.pid} (${proc.name}): ${error.message}`);
  if (failed.length > 0) process.exit(1);
  // Give Windows a moment to release file handles before the next step.
  await new Promise(resolve => setTimeout(resolve, 800));
}
