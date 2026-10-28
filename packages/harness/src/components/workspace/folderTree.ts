import type { FileTreeNode } from '@contenox/ui';
import { ROOT_DIR, type DirCache } from '../../pages/chat/lib/workspaceTree';

export function joinRootRelative(root: string, rel: string): string {
  const base = root.replace(/[\\/]+$/, '');
  const windows = root.includes('\\') && !root.includes('/');
  const sep = windows ? '\\' : '/';
  const cleaned = rel.replace(/^\.?[\\/]+/, '').replace(/[\\/]+$/, '');
  if (cleaned === '' || cleaned === '.') return windows && /^[A-Za-z]:$/.test(base) ? base + sep : base;
  return `${base}${sep}${windows ? cleaned.replace(/\//g, '\\') : cleaned}`;
}

export function folderBasename(path: string): string {
  const segments = path.split(/[\\/]+/).filter(s => s.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : '';
}

export function toFolderNodes(cache: DirCache, dirPath: string = ROOT_DIR): FileTreeNode[] {
  const entries = cache[dirPath];
  if (!entries) return [];
  return entries
    .filter(e => e.isDirectory)
    .map(e => ({
      id: e.path,
      name: e.name,
      path: e.path,
      isDirectory: true,
      children: cache[e.path] ? toFolderNodes(cache, e.path) : undefined,
    }));
}
