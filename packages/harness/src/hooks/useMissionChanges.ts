import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiError } from '../lib/fetch';
import { missionKeys } from '../lib/queryKeys';
import type { MissionChangesResponse, MissionFileDiff } from '../lib/types';

export type MissionChangesData = MissionChangesResponse | null;

export async function fetchMissionChanges(id: string): Promise<MissionChangesData> {
  try {
    return await api.getMissionChanges(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface MissionChangesState {
  data?: MissionChangesResponse;
  isAbsent: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function deriveMissionChangesState(
  data: MissionChangesData | undefined,
  isLoading: boolean,
  error: Error | null,
  refetch: () => void,
): MissionChangesState {
  return {
    data: data ?? undefined,
    isAbsent: data === null,
    isLoading,
    error,
    refetch,
  };
}

export function useMissionChanges(id: string, opts?: { enabled?: boolean }): MissionChangesState {
  const query = useQuery<MissionChangesData, Error>({
    queryKey: missionKeys.changes(id),
    queryFn: () => fetchMissionChanges(id),
    enabled: !!id && opts?.enabled !== false,
    refetchInterval: 5000,
    retry: false,
  });
  return deriveMissionChangesState(query.data, query.isLoading, query.error ?? null, () =>
    query.refetch(),
  );
}

export function useMissionChangeDiff(
  id: string,
  path: string | null,
  opts?: { enabled?: boolean },
): UseQueryResult<MissionFileDiff, Error> {
  return useQuery<MissionFileDiff, Error>({
    queryKey: missionKeys.changeDiff(id, path ?? ''),
    queryFn: () => api.getMissionChangeDiff(id, path as string),
    enabled: !!id && !!path && opts?.enabled !== false,
    staleTime: 30_000,
    retry: false,
  });
}
