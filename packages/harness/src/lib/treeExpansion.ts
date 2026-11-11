import type { DirCache } from '../pages/chat/lib/workspaceTree';
import { parentDir, type WorkspaceEvent } from './workspaceEvents';

export type Expanded = ReadonlySet<string>;

const under = (path: string, dir: string) => path === dir || path.startsWith(`${dir}/`);

export function withOpen(set: Expanded, dirs: readonly string[], open: boolean): Expanded {
  const changed = dirs.filter(dir => set.has(dir) !== open);
  if (changed.length === 0) return set;
  const next = new Set(set);
  for (const dir of changed) {
    if (open) next.add(dir);
    else next.delete(dir);
  }
  return next;
}

export function withoutUnder(set: Expanded, path: string): Expanded {
  if (![...set].some(dir => under(dir, path))) return set;
  return new Set([...set].filter(dir => !under(dir, path)));
}

export function movedUnder(set: Expanded, from: string, to: string): Expanded {
  if (from === to || ![...set].some(dir => under(dir, from))) return set;
  return new Set([...set].map(dir => (under(dir, from) ? to + dir.slice(from.length) : dir)));
}

export function expandedForEvent(set: Expanded, event: WorkspaceEvent): Expanded {
  switch (event.type) {
    case 'fs.deleted':
      return withoutUnder(set, event.subject);
    case 'fs.moved': {
      const from = typeof event.data?.from === 'string' ? event.data.from : null;
      return from ? movedUnder(set, from, event.subject) : set;
    }
    default:
      return set;
  }
}

export function dirsToLoad(set: Expanded, cache: DirCache): string[] {
  return [...set].filter(
    dir =>
      cache[dir] === undefined &&
      !!cache[parentDir(dir)]?.some(e => e.path === dir && e.isDirectory),
  );
}
