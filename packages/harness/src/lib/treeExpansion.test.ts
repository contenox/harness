import { describe, expect, it } from 'vitest';
import type { DirCache } from '../pages/chat/lib/workspaceTree';
import { dirsToLoad, expandedForEvent, movedUnder, withOpen, withoutUnder } from './treeExpansion';
import type { WorkspaceEvent } from './workspaceEvents';

const ev = (type: string, subject: string, data?: Record<string, unknown>): WorkspaceEvent => ({
  nid: 1,
  type,
  source: 'watcher',
  subject,
  time: '2026-11-10T00:00:00Z',
  data,
});

describe('withOpen', () => {
  it('returns the same set when nothing changes', () => {
    const set = new Set(['src']);
    expect(withOpen(set, ['src'], true)).toBe(set);
    expect(withOpen(set, ['docs'], false)).toBe(set);
  });

  it('opens and closes folders', () => {
    expect([...withOpen(new Set(['src']), ['docs', 'docs/a'], true)]).toEqual([
      'src',
      'docs',
      'docs/a',
    ]);
    expect([...withOpen(new Set(['src', 'docs']), ['src'], false)]).toEqual(['docs']);
  });
});

describe('withoutUnder', () => {
  it('drops the folder and everything below it, not siblings sharing a prefix', () => {
    const set = new Set(['src', 'src/lib', 'src-old', 'docs']);
    expect([...withoutUnder(set, 'src')]).toEqual(['src-old', 'docs']);
  });
});

describe('movedUnder', () => {
  it('carries open folders to the new location', () => {
    const set = new Set(['src', 'src/lib', 'src-old']);
    expect([...movedUnder(set, 'src', 'pkg/src')]).toEqual(['pkg/src', 'pkg/src/lib', 'src-old']);
  });

  it('returns the same set when nothing is open below the source', () => {
    const set = new Set(['docs']);
    expect(movedUnder(set, 'src', 'pkg')).toBe(set);
  });
});

describe('expandedForEvent', () => {
  const set = new Set(['src', 'src/lib']);

  it('forgets deleted folders', () => {
    expect([...expandedForEvent(set, ev('fs.deleted', 'src/lib'))]).toEqual(['src']);
  });

  it('follows moved folders', () => {
    expect([...expandedForEvent(set, ev('fs.moved', 'lib', { from: 'src/lib' }))]).toEqual([
      'src',
      'lib',
    ]);
  });

  it('ignores other events', () => {
    expect(expandedForEvent(set, ev('fs.modified', 'src/lib/a.go'))).toBe(set);
  });
});

describe('dirsToLoad', () => {
  const cache: DirCache = {
    '': [
      { path: 'src', name: 'src', isDirectory: true },
      { path: 'docs', name: 'docs', isDirectory: true },
      { path: 'notes', name: 'notes', isDirectory: false },
    ],
    src: [{ path: 'src/lib', name: 'lib', isDirectory: true }],
  };

  it('loads open folders that are listed but not loaded yet', () => {
    expect(dirsToLoad(new Set(['src', 'docs', 'src/lib']), cache)).toEqual(['docs', 'src/lib']);
  });

  it('skips folders whose row is not listed, such as stale or removed ones', () => {
    expect(dirsToLoad(new Set(['gone', 'src/gone/deep', 'notes']), cache)).toEqual([]);
  });
});
