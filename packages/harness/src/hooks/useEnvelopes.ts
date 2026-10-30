import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import { envelopeKeys } from '../lib/queryKeys';
import type { Envelope } from '../lib/types';

export function useEnvelopes(): UseQueryResult<Envelope[], Error> {
  return useQuery<Envelope[], Error>({
    queryKey: envelopeKeys.list(),
    queryFn: () => api.listEnvelopes(),
  });
}
