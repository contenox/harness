import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiError } from '../lib/fetch';
import { workspaceRootKeys } from '../lib/queryKeys';
import type { WorkspaceRoot } from '../lib/types';
import { activeWorkspaceRoot } from '../lib/workspaceRoots';

export type WorkspaceRootsData = WorkspaceRoot[] | null;

export async function fetchWorkspaceRoots(): Promise<WorkspaceRootsData> {
  try {
    const resp = await api.getWorkspaceRoots();
    return resp.roots ?? [];
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface WorkspaceRootsState {
  roots: WorkspaceRoot[];
  defaultRoot?: WorkspaceRoot;
  isAbsent: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function deriveWorkspaceRootsState(
  data: WorkspaceRootsData | undefined,
  isLoading: boolean,
  error: Error | null,
): WorkspaceRootsState {
  const isAbsent = data === null;
  const roots = data ?? [];
  return {
    roots,
    defaultRoot: activeWorkspaceRoot(roots),
    isAbsent,
    isLoading,
    error,
  };
}

export function useWorkspaceRoots(): WorkspaceRootsState {
  const query = useQuery<WorkspaceRootsData, Error>({
    queryKey: workspaceRootKeys.list(),
    queryFn: fetchWorkspaceRoots,
    staleTime: 60_000,
    retry: false,
  });
  return deriveWorkspaceRootsState(query.data, query.isLoading, query.error ?? null);
}
