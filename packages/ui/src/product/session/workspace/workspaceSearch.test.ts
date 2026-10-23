import { describe, expect, it } from 'vitest';
import type { WorkspaceEntry } from '../lib/workspaceTree';
import { workspaceSearch } from './workspaceSearch';

const TREE: Record<string, WorkspaceEntry[]> = {
  '': [
    { path: 'src', name: 'src', isDirectory: true },
    { path: 'node_modules', name: 'node_modules', isDirectory: true },
    { path: 'README.md', name: 'README.md', isDirectory: false },
  ],
  src: [
    { path: 'src/pages', name: 'pages', isDirectory: true },
    { path: 'src/main.go', name: 'main.go', isDirectory: false },
  ],
  'src/pages': [{ path: 'src/pages/home.ts', name: 'home.ts', isDirectory: false }],
};

async function listDir(dir: string): Promise<WorkspaceEntry[]> {
  return TREE[dir] ?? [];
}

describe('workspaceSearch', () => {
  it('finds files by case-insensitive path substring, skipping noise dirs', async () => {
    const hits = await workspaceSearch('main', listDir);
    expect(hits).toEqual([{ path: 'src/main.go', name: 'main.go' }]);
    const more = await workspaceSearch('HOME', listDir);
    expect(more).toEqual([{ path: 'src/pages/home.ts', name: 'home.ts' }]);
  });

  it('never descends into node_modules', async () => {
    const hits = await workspaceSearch('node_modules', listDir);
    expect(hits).toHaveLength(0);
  });

  it('returns nothing for a blank query', async () => {
    expect(await workspaceSearch('   ', listDir)).toEqual([]);
  });
});
