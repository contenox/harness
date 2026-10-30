import { describe, expect, it } from 'vitest';
import type { SessionInfo } from '../../lib/acp';
import type { WorkspaceRoot } from '../../lib/types';
import { groupSessionsByProject } from './sessionGroups';

const roots: WorkspaceRoot[] = [
  { path: '/p/a', default: false },
  { path: '/p/b', default: false },
];

const s = (sessionId: string, cwd?: string, updatedAt?: string): SessionInfo =>
  ({ sessionId, cwd, updatedAt }) as SessionInfo;

describe('groupSessionsByProject', () => {
  it('nests sessions under their project, newest first, and keeps empty projects', () => {
    const g = groupSessionsByProject(
      [
        s('old', '/p/a', '2026-01-01T00:00:00Z'),
        s('new', '/p/a/sub', '2026-02-01T00:00:00Z'),
      ],
      roots,
    );
    expect(g.projects.map(p => p.sessions.map(x => x.sessionId))).toEqual([['new', 'old'], []]);
    expect(g.other).toEqual([]);
  });

  it('orders projects by latest activity, then empty projects by name', () => {
    const many: WorkspaceRoot[] = [
      { path: '/p/zeta', default: false },
      { path: '/p/alpha', default: false },
      { path: '/p/older', default: false },
      { path: '/p/newer', default: false },
    ];
    const g = groupSessionsByProject(
      [s('o', '/p/older', '2026-01-01T00:00:00Z'), s('n', '/p/newer', '2026-03-01T00:00:00Z')],
      many,
    );
    expect(g.projects.map(p => p.root.path)).toEqual(['/p/newer', '/p/older', '/p/alpha', '/p/zeta']);
  });

  it('puts sessions outside every project in other', () => {
    const g = groupSessionsByProject([s('x', '/elsewhere'), s('y')], roots);
    expect(g.other.map(x => x.sessionId)).toEqual(['x', 'y']);
  });
});
