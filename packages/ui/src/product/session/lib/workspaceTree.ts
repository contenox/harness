/**
 * Pure helpers turning the per-directory `/files` cache into the shapes the
 * workspace panel and the `@`-mention menu consume: a `FileTree` node tree
 * (built lazily — a directory's children appear only once that directory has
 * been loaded) and a flat file list for mention autocomplete. No React, no
 * fetching — `useWorkspaceFiles` owns those; this is what the tests exercise.
 */
import type { FileTreeNode } from '@contenox/ui';
import type { WorkspaceFileRef } from './mentions';

/**
 * Node fields a caller attaches to decorate a tree node: trailing indicators
 * (icons wired by the caller), whether the row is dimmed, and an optional row
 * tooltip.
 */
export type NodeDecoration = Pick<FileTreeNode, 'indicators' | 'dimmed' | 'title'>;

/** Supplies the per-path {@link NodeDecoration}; returns undefined for no overlay. */
export type NodeDecorator = (path: string) => NodeDecoration | undefined;

export interface WorkspaceEntry {
  /** Path relative to the workspace root. */
  path: string;
  name: string;
  isDirectory: boolean;
}

/** Per-directory listing cache. Key: a directory's root-relative path; the root is `''`. */
export type DirCache = Record<string, WorkspaceEntry[] | undefined>;

/** The cache key for the root directory. */
export const ROOT_DIR = '';

/**
 * Builds `FileTree` nodes for the directory at `dirPath` from the cache. A
 * subdirectory's `children` is populated when that directory is loaded and left
 * `undefined` when it is not (so the tree can lazy-load on expand). Files carry
 * no children. When a {@link NodeDecorator} is given, each node is enriched with
 * its decoration overlay (indicators / dimmed / tooltip) merged by path.
 */
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

/** The directory holding `path`: the root's key for a top-level name. */
export function parentDir(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? ROOT_DIR : path.slice(0, slash);
}

/** Joins a directory key and a name into the path the wire uses. */
export function childPath(dir: string, name: string): string {
  return dir === ROOT_DIR ? name : `${dir}/${name}`;
}

/** Whether `path` is `dir` itself or lies beneath it. */
export function isWithin(dir: string, path: string): boolean {
  return dir === ROOT_DIR || path === dir || path.startsWith(`${dir}/`);
}

/**
 * The deepest directory loaded in `cache` that is `path`'s parent or one of its
 * ancestors, or null when none is: the directory to re-read to learn that
 * something appeared or vanished beneath it.
 */
export function nearestLoadedDir(cache: DirCache, path: string): string | null {
  let dir = parentDir(path);
  for (;;) {
    if (cache[dir] !== undefined) return dir;
    if (dir === ROOT_DIR) return null;
    dir = parentDir(dir);
  }
}

/**
 * Replaces one directory's listing in place. Cached directories beneath it that
 * the new listing no longer names are dropped, so a folder that was deleted or
 * renamed does not linger as a loaded one; everything else stays loaded.
 */
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

/** Drops one directory and everything cached beneath it. */
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

/**
 * Flattens every loaded file (not directories) across the cache into a
 * de-duplicated mention list, sorted by path — the candidate set the `@`-menu
 * autocompletes over. Only loaded directories contribute, so mentioning a deep
 * file requires the tree to have listed its directory first.
 */
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
