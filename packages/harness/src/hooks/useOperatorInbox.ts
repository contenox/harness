import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ApiError } from '../lib/fetch';
import { operatorInboxKeys } from '../lib/queryKeys';
import type { OperatorInboxItem } from '../lib/types';

export type OperatorInboxData = OperatorInboxItem[] | null;

export async function fetchOperatorInbox(): Promise<OperatorInboxData> {
  try {
    return await api.getOperatorInbox();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function useOperatorInbox(): UseQueryResult<OperatorInboxData, Error> {
  return useQuery<OperatorInboxData, Error>({
    queryKey: operatorInboxKeys.list(),
    queryFn: fetchOperatorInbox,
    refetchInterval: 5000,
    retry: false,
  });
}
