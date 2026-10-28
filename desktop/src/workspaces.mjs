import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';




export function existingDir(candidate) {
  if (!candidate || typeof candidate !== 'string') return null;
  try {
    if (!fs.statSync(candidate).isDirectory()) return null;
    return fs.realpathSync(candidate);
  } catch {
    return null;
  }
}



export function validateWorkspace(candidate, base = process.cwd(), home = os.homedir()) {
  if (!candidate || typeof candidate !== 'string' || !candidate.trim()) {
    return { error: 'Select a workspace folder.' };
  }
  const absolute = path.resolve(base, candidate.trim());
  const real = existingDir(absolute);
  if (!real) return { error: `That folder does not exist: ${absolute}` };
  if (real === path.parse(real).root) {
    return { error: 'That is the filesystem root. Choose a project folder inside it.' };
  }
  const homeDir = existingDir(home);
  if (homeDir && real === homeDir) {
    return { error: 'That is your home folder. Choose a project folder inside it.' };
  }
  return { path: real };
}



export function workspaceFromArgv(argv, cwd) {
  for (const arg of argv) {
    if (!arg || arg.startsWith('-')) continue;
    if (arg.endsWith('.asar')) continue;
    return path.resolve(cwd, arg);
  }
  return null;
}
