import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { setupKeys } from '../lib/queryKeys';

export function useShellEnv(enabled: boolean) {
  return useQuery({
    queryKey: setupKeys.shellEnv(),
    queryFn: api.getShellEnv,
    enabled,
    staleTime: 30_000,
  });
}
