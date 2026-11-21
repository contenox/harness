import { describe, expect, it } from 'vitest';
import { browserChatSession, browserWorkspaceCovers } from './browserWorkspace';

describe('Browser workspace scope', () => {
  it.each([
    [undefined, null, 'linux', true],
    ['/repo', undefined, 'linux', false],
    ['/repo/', '/repo', 'linux', true],
    ['/repo', '/repo/sub/./nested', 'linux', true],
    ['/repo', '/repo/../other', 'linux', false],
    ['/repo', '/repo-other', 'linux', false],
    ['/', '/repo', 'linux', true],
    ['/Repo', '/repo/sub', 'darwin', false],
    ['/repo', '/repo\\sub', 'linux', false],
    ['C:\\Repo', 'c:/REPO/sub', 'win32', true],
    ['C:\\Repo', 'C:/repo/sub/../../sibling', 'win32', false],
    ['C:\\', 'D:/repo', 'win32', false],
    ['\\\\host\\share', '//HOST/share/sub', 'win32', true],
    ['\\\\host\\share', '//host/share2', 'win32', false],
  ] as const)('matches %s against %s on %s', (scope, cwd, platform, expected) => {
    expect(browserWorkspaceCovers(scope, cwd, platform)).toBe(expected);
  });

  it('returns to the active covered chat, then another covered chat, then a new chat', () => {
    const sessions = [
      { sessionId: 'other', cwd: 'C:\\repo-other' },
      { sessionId: 'one', cwd: 'C:\\Repo\\one' },
      { sessionId: 'two', cwd: 'c:/repo/two' },
    ];
    expect(browserChatSession('C:/repo', 'two', sessions, 'win32')).toBe('two');
    expect(browserChatSession('C:/repo', 'other', sessions, 'win32')).toBe('one');
    expect(browserChatSession('D:/repo', 'other', sessions, 'win32')).toBeUndefined();
    expect(browserChatSession(undefined, 'other', sessions, 'win32')).toBe('other');
  });
});
