import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import { agentIdentityKeys } from '../lib/queryKeys';
import type { AgentIdentity, AgentIdentityCheck, AgentIdentityState, AgentKey } from '../lib/types';

export function useAgentIdentity(enabled = true): UseQueryResult<AgentIdentityState, Error> {
  return useQuery<AgentIdentityState, Error>({
    queryKey: agentIdentityKeys.state(),
    queryFn: () => api.getAgentIdentity(),
    enabled,
  });
}

export function useSaveAgentIdentity() {
  const queryClient = useQueryClient();
  return useMutation<AgentIdentityState, Error, AgentIdentity>({
    mutationFn: body => api.putAgentIdentity(body),
    onSuccess: state => queryClient.setQueryData(agentIdentityKeys.state(), state),
  });
}

export function useGenerateAgentKey() {
  const queryClient = useQueryClient();
  return useMutation<AgentKey, Error, string>({
    mutationFn: comment => api.generateAgentKey(comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agentIdentityKeys.state() }),
  });
}

export function useCheckAgentIdentity() {
  return useMutation<AgentIdentityCheck, Error, { key: string; host: string }>({
    mutationFn: ({ key, host }) => api.checkAgentIdentity(key, host),
  });
}
