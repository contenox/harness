import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import { hitlPolicyKeys } from '../lib/queryKeys';

export function useListPolicies(): UseQueryResult<string[], Error> {
  return useQuery<string[], Error>({
    queryKey: hitlPolicyKeys.list(),
    queryFn: () => api.listPolicies(),
  });
}
