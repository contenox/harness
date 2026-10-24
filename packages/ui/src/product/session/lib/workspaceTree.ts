import type { FileTreeNode } from '@contenox/ui';
import type { WorkspaceFileRef } from './mentions';

export type NodeDecoration = Pick<FileTreeNode, 'indicators' | 'dimmed' | 'title'>;

export type NodeDecorator = (path: string) => NodeDecoration | undefined;

export interface WorkspaceEntry {
  path: string;
  name: string;
  isDirectory: boolean;
}

export type DirCache = Record<string, WorkspaceEntry[] | undefined>;

export const ROOT_DIR = '';

export function toFileTreeNodes(
  cache: DirCache,
  dirPath: string = ROOT_DIR,
  decorate?: NodeDecorator,
): FileTreeNode[] {
  const entries = cache[dirPath];
  if (!entries) return [];
  return entries.map(e => ({
    id: e.path,
    name: e.name,
    path: e.path,
    isDirectory: e.isDirectory,
    children: e.isDirectory
      ? cache[e.path]
        ? toFileTreeNodes(cache, e.path, decorate)
        : undefined
      : undefined,
    ...(decorate?.(e.path) ?? {}),
  }));
}

export function parentDir(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? ROOT_DIR : path.slice(0, slash);
}

export function childPath(dir: string, name: string): string {
  return dir === ROOT_DIR ? name : `${dir}/${name}`;
}

export function isWithin(dir: string, path: string): boolean {
  return dir === ROOT_DIR || path === dir || path.startsWith(`${dir}/`);
}

export function nearestLoadedDir(cache: DirCache, path: string): string | null {
  let dir = parentDir(path);
  for (;;) {
    if (cache[dir] !== undefined) return dir;
    if (dir === ROOT_DIR) return null;
    dir = parentDir(dir);
  }
}

export function replaceDirectory(
  cache: DirCache,
  dir: string,
  entries: WorkspaceEntry[],
): DirCache {
  const kept = new Set(entries.filter(e => e.isDirectory).map(e => e.path));
  const next: DirCache = {};
  for (const [key, value] of Object.entries(cache)) {
    const beneath = key !== dir && isWithin(dir, key);
    if (beneath && !isWithinAny(kept, key)) continue;
    next[key] = value;
  }
  next[dir] = entries;
  return next;
}

export function removeDirectory(cache: DirCache, dir: string): DirCache {
  const next: DirCache = {};
  for (const [key, value] of Object.entries(cache)) {
    if (!isWithin(dir, key)) next[key] = value;
  }
  return next;
}

function isWithinAny(dirs: ReadonlySet<string>, path: string): boolean {
  for (const dir of dirs) if (isWithin(dir, path)) return true;
  return false;
}

export function flattenFiles(cache: DirCache): WorkspaceFileRef[] {
  const seen = new Set<string>();
  const out: WorkspaceFileRef[] = [];
  for (const entries of Object.values(cache)) {
    if (!entries) continue;
    for (const e of entries) {
      if (e.isDirectory || seen.has(e.path)) continue;
      seen.add(e.path);
      out.push({ path: e.path, name: e.name });
    }
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}
