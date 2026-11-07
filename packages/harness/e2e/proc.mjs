import { execFileSync } from 'node:child_process';

export function pidOnPort(port) {
  if (process.platform === 'win32') {
    const out = execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'latin1' });
    for (const line of out.split(/\r?\n/)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 5) continue;
      const [, local, remote] = cols;
      if (!local.endsWith(`:${port}`)) continue;
      if (!/^(0\.0\.0\.0|\[::\]):0$/.test(remote)) continue;
      const pid = Number(cols[cols.length - 1]);
      if (pid > 0) return pid;
    }
    return null;
  }
  try {
    const out = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
    const pid = Number(out.split('\n')[0]);
    return pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function stopPort(port) {
  const pid = pidOnPort(port);
  if (pid === null) return false;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    return false;
  }
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('proc.mjs') && process.argv[2] === 'stop') {
  for (const port of process.argv.slice(3)) stopPort(Number(port));
}
