import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { workspaceAccessKeys } from '../lib/queryKeys';
import {
  dedupeSortPaths,
  fetchWorkspaceAccess,
  verdictsToMap,
  HITL_POLICY_DEFAULT_VALUE,
  type PathVerdict,
} from '../lib/workspaceAccess';

export interface UseWorkspaceAccessOptions {
  root: string | null | undefined;
  policy?: string | null;
  paths: readonly string[];
  enabled: boolean;
}

export interface WorkspaceAccessResult {
  verdicts: Map<string, PathVerdict>;
  policyName?: string;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_VERDICTS: Map<string, PathVerdict> = new Map();

export function useWorkspaceAccess({
  root,
  policy,
  paths,
  enabled,
}: UseWorkspaceAccessOptions): WorkspaceAccessResult {
  const sortedPaths = useMemo(() => dedupeSortPaths(paths), [paths]);
  const pathsKey = sortedPaths.join('\n');
  const trimmedPolicy = policy?.trim();
  const policyKey =
    trimmedPolicy && trimmedPolicy !== HITL_POLICY_DEFAULT_VALUE ? trimmedPolicy : '';
  const active = enabled && !!root && sortedPaths.length > 0;

  const query = useQuery({
    queryKey: workspaceAccessKeys.batch(root ?? '', policyKey, pathsKey),
    queryFn: () => fetchWorkspaceAccess(root as string, policy, sortedPaths),
    enabled: active,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });

  const verdicts = useMemo(
    () => (active && query.data ? verdictsToMap(query.data.verdicts) : EMPTY_VERDICTS),
    [active, query.data],
  );

  return {
    verdicts,
    policyName: active ? query.data?.policyName : undefined,
    isLoading: active && query.isFetching,
    error: active && query.error instanceof Error ? query.error.message : null,
  };
}
