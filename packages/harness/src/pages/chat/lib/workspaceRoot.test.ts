import { describe, expect, it } from 'vitest';
import { mostRecentProjectRoot, resolveWorkspaceRoot } from './workspaceRoot';

describe('resolveWorkspaceRoot', () => {
  it('uses the live session cwd once a session exists', () => {
    expect(
      resolveWorkspaceRoot({
        onEmptyChat: false,
        stagedRoot: undefined,
        defaultRoot: '/srv/default',
        activeSessionCwd: '/work/session-cwd',
      }),
    ).toBe('/work/session-cwd');
  });

  it('prefers the staged pick over the default on the empty chat', () => {
    expect(
      resolveWorkspaceRoot({
        onEmptyChat: true,
        stagedRoot: '/work/picked',
        defaultRoot: '/srv/default',
        activeSessionCwd: null,
      }),
    ).toBe('/work/picked');
  });

  it('falls back to the workspace default when nothing is staged', () => {
    expect(
      resolveWorkspaceRoot({
        onEmptyChat: true,
        stagedRoot: undefined,
        defaultRoot: '/srv/default',
        activeSessionCwd: null,
      }),
    ).toBe('/srv/default');
  });

  it('treats an empty staged pick as "none"', () => {
    expect(
      resolveWorkspaceRoot({
        onEmptyChat: true,
        stagedRoot: '',
        defaultRoot: '/srv/default',
        activeSessionCwd: null,
      }),
    ).toBe('/srv/default');
  });

  it('resolves an external empty chat (no staged pick) to the default root, not null', () => {
    expect(
      resolveWorkspaceRoot({
        onEmptyChat: true,
        stagedRoot: undefined,
        defaultRoot: '/srv/default',
        activeSessionCwd: null,
      }),
    ).toBe('/srv/default');
  });

  it('returns null when the empty chat has neither a staged pick nor a default', () => {
    expect(
      resolveWorkspaceRoot({
        onEmptyChat: true,
        stagedRoot: undefined,
        defaultRoot: undefined,
        activeSessionCwd: null,
      }),
    ).toBeNull();
  });
});

describe('mostRecentProjectRoot / recentRoot', () => {
  const roots = [
    { path: 'C:/a', default: false },
    { path: 'C:/b', default: true },
  ];
  it('picks the project of the most recently updated session', () => {
    expect(
      mostRecentProjectRoot(
        [
          { cwd: 'C:/a/x', updatedAt: '2026-01-01T00:00:00Z' },
          { cwd: 'C:/b', updatedAt: '2026-02-01T00:00:00Z' },
          { cwd: 'D:/unknown', updatedAt: '2027-01-01T00:00:00Z' },
        ],
        roots,
      ),
    ).toBe('C:/b');
  });
  it('is null without history', () => {
    expect(mostRecentProjectRoot([], roots)).toBeNull();
  });
  it('staged wins over recent, recent over default', () => {
    const base = { onEmptyChat: true, defaultRoot: 'C:/def', activeSessionCwd: null };
    expect(resolveWorkspaceRoot({ ...base, stagedRoot: 'C:/s', recentRoot: 'C:/a' })).toBe('C:/s');
    expect(resolveWorkspaceRoot({ ...base, stagedRoot: undefined, recentRoot: 'C:/a' })).toBe('C:/a');
    expect(resolveWorkspaceRoot({ ...base, stagedRoot: undefined, recentRoot: null })).toBe('C:/def');
  });
});
