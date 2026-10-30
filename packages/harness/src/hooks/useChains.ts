import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import { chainKeys } from '../lib/queryKeys';

export function useListChains(): UseQueryResult<string[], Error> {
  return useQuery<string[], Error>({
    queryKey: chainKeys.list(),
    queryFn: () => api.listChains(),
  });
}
