import type { WorkspaceEntry } from '../lib/workspaceTree';

export interface SearchMatch {
  path: string;
  name: string;
}

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.cache']);
const MAX_DIRS = 400;
const MAX_DEPTH = 8;
const MAX_RESULTS = 100;

export type DirLister = (dir: string) => Promise<WorkspaceEntry[]>;

export async function workspaceSearch(query: string, listDir: DirLister): Promise<SearchMatch[]> {
  const q = query.trim().toLowerCase();
  if (q === '') return [];
  const out: SearchMatch[] = [];
  let visited = 0;
  let frontier = [''];

  for (let depth = 0; frontier.length > 0 && depth <= MAX_DEPTH; depth++) {
    const next: string[] = [];
    for (const dir of frontier) {
      if (visited >= MAX_DIRS) return out;
      visited++;
      let entries: WorkspaceEntry[];
      try {
        entries = await listDir(dir);
      } catch {
        continue;
      }
      for (const e of entries) {
        if (out.length >= MAX_RESULTS) return out;
        if (e.isDirectory) {
          if (SKIP_DIRS.has(e.name.toLowerCase())) continue;
          next.push(e.path);
        } else if (e.path.toLowerCase().includes(q)) {
          out.push({ path: e.path, name: e.name });
        }
      }
    }
    frontier = next;
  }
  return out;
}
