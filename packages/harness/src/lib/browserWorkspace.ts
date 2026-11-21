import type { SessionInfo } from '@contenox/acp-client';

// Match the runtime's filepath.Clean on absolute workspace and session paths.
function cleanAbsolutePath(value: string, platform?: string): string | null {
  let path = value.trim();
  let root = '/';
  if (platform === 'win32') {
    path = path.replace(/\\/g, '/').toLowerCase();
    const volume = path.match(/^(?:[a-z]:\/|\/\/[^/]+\/[^/]+(?:\/|$))/)?.[0];
    if (!volume) return null;
    root = volume.endsWith('/') ? volume : volume + '/';
    path = path.slice(volume.length);
  } else if (!path.startsWith('/')) {
    return null;
  }

  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return root + parts.join('/');
}

export function browserWorkspaceCovers(
  workspace: string | undefined,
  cwd: string | null | undefined,
  platform?: string,
): boolean {
  if (!workspace?.trim()) return true;
  const root = cleanAbsolutePath(workspace, platform);
  const dir = cleanAbsolutePath(cwd ?? '', platform);
  if (!root || !dir) return false;
  return dir === root || dir.startsWith(root.endsWith('/') ? root : root + '/');
}

export function browserChatSession(
  workspace: string | undefined,
  activeSessionId: string | null,
  sessions: readonly SessionInfo[],
  platform?: string,
) {
  if (!workspace) return activeSessionId;
  const covers = (session: SessionInfo) => browserWorkspaceCovers(workspace, session.cwd, platform);
  const active = sessions.find(session => session.sessionId === activeSessionId);
  if (active && covers(active)) return activeSessionId;
  return sessions.find(covers)?.sessionId;
}
