import type { SessionInfo } from '../../../lib/acp';

export function meaningfulTitle(session: SessionInfo): string | null {
  const title = session.title?.trim();
  if (title && title !== session.sessionId) return title;
  return null;
}

export function workspaceLabel(cwd?: string | null): string | null {
  if (!cwd) return null;
  const parts = cwd.split(/[\\/]/).filter(Boolean); // Windows and POSIX separators
  if (parts.length === 0) return null;
  return parts[parts.length - 1];
}
