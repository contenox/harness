import type { WorkspaceRoot } from './types';


export function activeWorkspaceRoot(roots: readonly WorkspaceRoot[]): WorkspaceRoot | undefined {
  return roots.find(r => r.default) ?? roots[0];
}

export function shortenRootPath(path: string, maxSegments = 3): string {
  const trimmed = path.replace(/\/+$/, '');
  if (trimmed === '') return path;
  const segments = trimmed.split('/').filter(s => s.length > 0);
  if (segments.length <= maxSegments) return trimmed;
  return '…/' + segments.slice(-maxSegments).join('/');
}

function basename(path: string): string {
  const segments = path.split('/').filter(s => s.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : '';
}

export function projectName(root: WorkspaceRoot): string {
  const name = root.name?.trim();
  if (name) return name;
  return basename(root.path) || root.path;
}

function containsPath(root: string, target: string): boolean {
  return target === root || target.startsWith(root + '/');
}

export function projectForCwd(
  cwd: string | undefined | null,
  roots: readonly WorkspaceRoot[],
): WorkspaceRoot | null {
  if (!cwd) return null;
  const target = cwd.replace(/\/+$/, '');
  let best: WorkspaceRoot | null = null;
  let bestLen = -1;
  for (const root of roots) {
    const rootPath = root.path.replace(/\/+$/, '');
    if (!containsPath(rootPath, target)) continue;
    if (rootPath.length > bestLen) {
      best = root;
      bestLen = rootPath.length;
    }
  }
  return best;
}

export function workspaceNameForCwd(
  cwd: string | undefined | null,
  roots: readonly WorkspaceRoot[],
): string | null {
  const named = roots.filter(r => (r.name?.trim() ?? '') !== '');
  const root = projectForCwd(cwd, named);
  return root ? projectName(root) : null;
}

export function isWorkspaceRootRefusal(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    (m.includes('workspace root') && m.includes('not permitted')) ||
    m.includes('not under any configured workspace root')
  );
}

export function extractRefusedRoot(message: string | undefined | null): string | null {
  if (!message) return null;
  const match = message.match(/workspace (?:root|directory)\s+"([^"]*)"/i);
  return match ? match[1] : null;
}
