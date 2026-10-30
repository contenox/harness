import type { WorkspaceRoot } from '../../../lib/types';
import { projectName } from '../../../lib/workspaceRoots';

/** Projects matching a free-text query on name or path (case-insensitive); blank query keeps all. */
export function filterProjects(roots: readonly WorkspaceRoot[], query: string): WorkspaceRoot[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [...roots];
  return roots.filter(r => projectName(r).toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
}
