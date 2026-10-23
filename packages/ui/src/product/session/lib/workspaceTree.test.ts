import { describe, expect, it } from 'vitest';
import {
  flattenFiles,
  ROOT_DIR,
  toFileTreeNodes,
  type DirCache,
  type NodeDecoration,
  type NodeDecorator,
} from './workspaceTree';

const cache: DirCache = {
  [ROOT_DIR]: [
    { path: 'src', name: 'src', isDirectory: true },
    { path: 'README.md', name: 'README.md', isDirectory: false },
  ],
  src: [{ path: 'src/app.ts', name: 'app.ts', isDirectory: false }],
};

describe('toFileTreeNodes', () => {
  it('builds root nodes with loaded children and undefined for unloaded dirs', () => {
    const partial: DirCache = { [ROOT_DIR]: cache[ROOT_DIR] };
    const nodes = toFileTreeNodes(partial);
    const dir = nodes.find(n => n.id === 'src')!;
    expect(dir.isDirectory).toBe(true);
    expect(dir.children).toBeUndefined();
  });

  it('populates children once the directory is loaded', () => {
    const nodes = toFileTreeNodes(cache);
    const dir = nodes.find(n => n.id === 'src')!;
    expect(dir.children).toEqual([
      {
        id: 'src/app.ts',
        name: 'app.ts',
        path: 'src/app.ts',
        isDirectory: false,
        children: undefined,
      },
    ]);
  });

  it('returns [] for an unloaded directory path', () => {
    expect(toFileTreeNodes({}, 'nope')).toEqual([]);
  });
});

describe('toFileTreeNodes decorator threading', () => {

  const decorate: NodeDecorator = path => {
    const table: Record<string, NodeDecoration> = {
      src: { indicators: [{ key: 'read', icon: null, status: 'allow', title: 'Read: allowed' }] },
      'README.md': {
        indicators: [
          { key: 'write', icon: null, status: 'approve', title: 'Write: needs approval' },
        ],
      },
      'src/app.ts': { dimmed: true, title: 'Outside' },
    };
    return table[path];
  };

  it('merges the decorator overlay onto nodes by path (files and dirs)', () => {
    const nodes = toFileTreeNodes(cache, undefined, decorate);
    expect(nodes.find(n => n.id === 'src')!.indicators?.[0].status).toBe('allow');
    expect(nodes.find(n => n.id === 'README.md')!.indicators?.[0].status).toBe('approve');
  });

  it('threads the decorator into loaded children too', () => {
    const child = toFileTreeNodes(cache, undefined, decorate)
      .find(n => n.id === 'src')!
      .children!.find(n => n.id === 'src/app.ts')!;
    expect(child.dimmed).toBe(true);
    expect(child.title).toBe('Outside');
  });

  it('leaves indicators/dimmed absent for the raw (no-decorator) view', () => {
    const node = toFileTreeNodes(cache)[0];
    expect(node.indicators).toBeUndefined();
    expect(node.dimmed).toBeUndefined();
  });

  it('leaves a node untouched when the decorator returns undefined for its path', () => {
    const onlyRoot: NodeDecorator = p => (p === 'src' ? { dimmed: true } : undefined);
    const nodes = toFileTreeNodes(cache, undefined, onlyRoot);
    expect(nodes.find(n => n.id === 'src')!.dimmed).toBe(true);
    expect(nodes.find(n => n.id === 'README.md')!.dimmed).toBeUndefined();
  });
});

describe('flattenFiles', () => {
  it('flattens loaded files across directories, de-duplicated and sorted', () => {
    expect(flattenFiles(cache)).toEqual([
      { path: 'README.md', name: 'README.md' },
      { path: 'src/app.ts', name: 'app.ts' },
    ]);
  });

  it('excludes directories', () => {
    expect(flattenFiles(cache).some(f => f.path === 'src')).toBe(false);
  });
});
