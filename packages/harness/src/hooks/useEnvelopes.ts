import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import { envelopeKeys } from '../lib/queryKeys';
import type { Envelope } from '../lib/types';

export function useEnvelopes(workspace?: string): UseQueryResult<Envelope[], Error> {
  const folder = workspace?.trim() || undefined;
  return useQuery<Envelope[], Error>({
    queryKey: envelopeKeys.list(folder),
    queryFn: () => api.listEnvelopes(folder),
  });
}
