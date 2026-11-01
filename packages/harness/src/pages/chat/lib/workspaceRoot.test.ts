import { describe, expect, it } from 'vitest';
import {
  mostRecentProjectRoot,
  relativeWorkspacePath,
  resolveWorkspaceRoot,
} from './workspaceRoot';

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

describe('relativeWorkspacePath', () => {
  const root = 'D:\\dev\\workspace\\contenox\\harness';

  it('turns an absolute Windows path into a path relative to the session cwd', () => {
    expect(
      relativeWorkspacePath(
        'D:\\dev\\workspace\\contenox\\harness\\packages\\harness\\src\\hooks\\useBackends.ts',
        root,
      ),
    ).toBe('packages/harness/src/hooks/useBackends.ts');
  });

  it('matches a Windows root regardless of case', () => {
    expect(relativeWorkspacePath('d:\\DEV\\workspace\\contenox\\HARNESS\\src\\a.ts', root)).toBe(
      'src/a.ts',
    );
  });

  it('matches a macOS project root regardless of case, keeping the reported suffix', () => {
    expect(
      relativeWorkspacePath(
        '/Users/Ada/Projects/App/Src/App.ts',
        '/users/ada/projects/app',
        'darwin',
      ),
    ).toBe('Src/App.ts');
  });

  it('matches a decomposed (NFD) macOS root against a composed one', () => {
    expect(
      relativeWorkspacePath('/Users/Ada/Proje\u0301ct/Src/App.ts', '/users/ada/projéct', 'darwin'),
    ).toBe('Src/App.ts');
  });

  it('turns an absolute POSIX path into a relative one', () => {
    expect(relativeWorkspacePath('/work/proj/src/a.ts', '/work/proj')).toBe('src/a.ts');
  });

  it('keeps POSIX roots case-sensitive on Linux, where Proj and proj are different folders', () => {
    expect(relativeWorkspacePath('/home/u/Proj/src/a.ts', '/home/u/proj', 'linux')).toBeNull();
    expect(relativeWorkspacePath('/home/u/proj/src/a.ts', '/home/u/proj', 'linux')).toBe(
      'src/a.ts',
    );
  });

  it('keeps POSIX roots case-sensitive when the platform is unknown', () => {
    expect(relativeWorkspacePath('/home/u/Proj/src/a.ts', '/home/u/proj')).toBeNull();
  });

  it('does not fold composed and decomposed names together on Linux', () => {
    expect(
      relativeWorkspacePath('/home/u/proje\u0301ct/a.ts', '/home/u/proj\u00e9ct', 'linux'),
    ).toBeNull();
  });

  it('still folds case for a Windows drive path whatever the platform reports', () => {
    expect(relativeWorkspacePath('d:/DEV/proj/a.ts', 'D:/dev/proj', 'linux')).toBe('a.ts');
  });

  it('unwraps file URLs reported by some agents', () => {
    expect(relativeWorkspacePath('file:///D:/dev/proj/src/a.ts', 'D:/dev/proj')).toBe('src/a.ts');
    expect(relativeWorkspacePath('file:///work/proj/src/a%20b.ts', '/work/proj')).toBe(
      'src/a b.ts',
    );
    expect(relativeWorkspacePath('file:///D:/dev/proj/%E0%A4%A', 'D:/dev/proj')).toBeNull();
  });

  it('matches a UNC root regardless of case', () => {
    expect(relativeWorkspacePath('//SERVER/Share/src/a.ts', '//server/share')).toBe('src/a.ts');
  });

  it('treats the filesystem root as the project root', () => {
    expect(relativeWorkspacePath('/src/a.ts', '/')).toBe('src/a.ts');
  });

  it('normalizes separators on an already-relative path', () => {
    expect(relativeWorkspacePath('src\\hooks\\useBackends.ts', 'D:/workspace')).toBe(
      'src/hooks/useBackends.ts',
    );
  });

  it('accepts a root with a trailing separator', () => {
    expect(relativeWorkspacePath('D:\\dev\\proj\\src\\a.ts', 'D:\\dev\\proj\\')).toBe('src/a.ts');
  });

  it('resolves dot segments that stay inside the root', () => {
    expect(relativeWorkspacePath('D:/dev/proj/src/../README.md', 'D:/dev/proj')).toBe('README.md');
  });

  it('refuses dot segments that leave the root', () => {
    expect(relativeWorkspacePath('D:/dev/proj/../other/a.ts', 'D:/dev/proj')).toBeNull();
  });

  it('refuses files outside the root instead of handing absolute paths to the API', () => {
    expect(relativeWorkspacePath('D:\\dev\\other\\a.ts', root)).toBeNull();
    expect(relativeWorkspacePath('D:\\dev\\workspace\\contenox\\harness2\\a.ts', root)).toBeNull();
  });

  it('refuses the root itself and empty input', () => {
    expect(relativeWorkspacePath(root, root)).toBeNull();
    expect(relativeWorkspacePath(`${root}\\`, root)).toBeNull();
    expect(relativeWorkspacePath('', root)).toBeNull();
  });

  it('only resolves absolute paths when a root is known', () => {
    expect(relativeWorkspacePath('D:\\dev\\proj\\a.ts', null)).toBeNull();
    expect(relativeWorkspacePath('src/a.ts', null)).toBe('src/a.ts');
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
    expect(resolveWorkspaceRoot({ ...base, stagedRoot: undefined, recentRoot: 'C:/a' })).toBe(
      'C:/a',
    );
    expect(resolveWorkspaceRoot({ ...base, stagedRoot: undefined, recentRoot: null })).toBe(
      'C:/def',
    );
  });
});
