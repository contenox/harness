import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspaceRoots } from '../../../hooks/useWorkspaceRoots';
import type { ConfigScope } from '../../../lib/agentsConfig';
import type { WorkspaceRoot } from '../../../lib/types';
import { projectName } from '../../../lib/workspaceRoots';

export const WORKSPACE_PARAM = 'workspace';

export type PermissionScope = {
  scope: ConfigScope;
  workspace: WorkspaceRoot | undefined;
  workspaceName: string | undefined;
  roots: WorkspaceRoot[];
  setWorkspace: (path: string | undefined) => void;
  search: string;
};

export function permissionsPath(name?: string, workspace?: string): string {
  const base = name ? `/permissions/${encodeURIComponent(name)}` : '/permissions';
  return workspace ? `${base}?${WORKSPACE_PARAM}=${encodeURIComponent(workspace)}` : base;
}

export function usePermissionScope(): PermissionScope {
  const [params, setParams] = useSearchParams();
  const { roots } = useWorkspaceRoots();
  const requested = params.get(WORKSPACE_PARAM)?.trim() || undefined;
  const workspace = requested ? roots.find(r => r.path === requested) : undefined;
  const path = workspace?.path ?? requested;

  const setWorkspace = useCallback(
    (next: string | undefined) => {
      setParams(
        prev => {
          const out = new URLSearchParams(prev);
          if (next) out.set(WORKSPACE_PARAM, next);
          else out.delete(WORKSPACE_PARAM);
          return out;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const scope = useMemo<ConfigScope>(() => (path ? { workspace: path } : {}), [path]);

  return {
    scope,
    workspace,
    workspaceName: workspace ? projectName(workspace) : path,
    roots,
    setWorkspace,
    search: path ? `?${WORKSPACE_PARAM}=${encodeURIComponent(path)}` : '',
  };
}
