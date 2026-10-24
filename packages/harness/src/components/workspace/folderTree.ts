import type { FileTreeNode } from '@contenox/ui';
import { ROOT_DIR, type DirCache } from '../../pages/chat/lib/workspaceTree';

export function joinRootRelative(root: string, rel: string): string {
  const base = root.replace(/\/+$/, '');
  const cleaned = rel.replace(/^\.?\/+/, '').replace(/\/+$/, '');
  return cleaned === '' || cleaned === '.' ? base : `${base}/${cleaned}`;
}

export function folderBasename(path: string): string {
  const segments = path.split('/').filter(s => s.length > 0);
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
