import type { SessionInfo } from '../../lib/acp';
import type { WorkspaceRoot } from '../../lib/types';
import { projectForCwd } from '../../lib/workspaceRoots';

export interface ProjectGroup {
  root: WorkspaceRoot;
  sessions: SessionInfo[];
}

export interface SessionGroups {
  projects: ProjectGroup[];
  other: SessionInfo[];
}

function updatedMs(s: SessionInfo): number {
  const ms = s.updatedAt ? Date.parse(s.updatedAt) : NaN;
  return Number.isNaN(ms) ? 0 : ms;
}

/** Most recent first; sessions without a timestamp sink to the bottom, keeping their order. */
export function sortByRecency(sessions: readonly SessionInfo[]): SessionInfo[] {
  return sessions
    .map((s, i) => ({ s, i }))
    .sort((a, b) => updatedMs(b.s) - updatedMs(a.s) || a.i - b.i)
    .map(x => x.s);
}

/** Every root becomes a group (even empty); sessions under no root land in `other`. */
export function groupSessionsByProject(
  sessions: readonly SessionInfo[],
  roots: readonly WorkspaceRoot[],
): SessionGroups {
  const byPath = new Map<string, SessionInfo[]>(roots.map(r => [r.path, []]));
  const other: SessionInfo[] = [];
  for (const session of sortByRecency(sessions)) {
    const root = projectForCwd(session.cwd, roots);
    const bucket = root ? byPath.get(root.path) : undefined;
    if (bucket) bucket.push(session);
    else other.push(session);
  }
  return {
    projects: roots.map(root => ({ root, sessions: byPath.get(root.path) ?? [] })),
    other,
  };
}
