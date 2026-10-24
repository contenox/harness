import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { setupKeys } from '../lib/queryKeys';

export function useCLIConfig(enabled: boolean) {
  return useQuery({
    queryKey: setupKeys.cliConfig(),
    queryFn: api.getCLIConfig,
    enabled,
    staleTime: 30_000,
  });
}
