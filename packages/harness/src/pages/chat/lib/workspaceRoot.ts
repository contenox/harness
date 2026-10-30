import type { SessionInfo } from '@contenox/acp-client';
import type { WorkspaceRoot } from '../../../lib/types';
import { projectForCwd } from '../../../lib/workspaceRoots';

export function resolveWorkspaceRoot(args: {
  onEmptyChat: boolean;
  stagedRoot: string | undefined;
  /** Project of the most recently updated session; preferred over the default root. */
  recentRoot?: string | null;
  defaultRoot: string | undefined;
  activeSessionCwd: string | null;
}): string | null {
  const { onEmptyChat, stagedRoot, recentRoot, defaultRoot, activeSessionCwd } = args;
  if (!onEmptyChat) return activeSessionCwd;
  if (stagedRoot) return stagedRoot;
  if (recentRoot) return recentRoot;
  return defaultRoot ?? null;
}

/** Project (root path) of the most recently updated session that lives in a known project. */
export function mostRecentProjectRoot(
  sessions: readonly Pick<SessionInfo, 'cwd' | 'updatedAt'>[],
  roots: readonly WorkspaceRoot[],
): string | null {
  let best: { root: string; at: number } | null = null;
  for (const s of sessions) {
    const root = projectForCwd(s.cwd, roots);
    if (!root) continue;
    const parsed = s.updatedAt ? Date.parse(s.updatedAt) : NaN;
    const at = Number.isNaN(parsed) ? -1 : parsed;
    if (!best || at > best.at) best = { root: root.path, at };
  }
  return best?.root ?? null;
}
