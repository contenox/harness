import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { agentKeys, externalAgentKeys } from '../lib/queryKeys';
import type {
  ExternalAgent,
  ExternalAgentCheck,
  ExternalAgentInput,
  ExternalAgentLogin,
  ExternalAgentPresetStatus,
} from '../lib/types';

const INSTALL_POLL_MS = 1500;
const LOGIN_POLL_MS = 1500;

export function refreshExternalAgents(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: externalAgentKeys.all });
  void queryClient.invalidateQueries({ queryKey: agentKeys.all });
}

export function useExternalAgents() {
  return useQuery<ExternalAgent[], Error>({
    queryKey: externalAgentKeys.list(),
    queryFn: api.listExternalAgents,
  });
}

export function useExternalAgentPresets() {
  const queryClient = useQueryClient();
  return useQuery<ExternalAgentPresetStatus[], Error>({
    queryKey: externalAgentKeys.presets(),
    queryFn: async () => {
      const presets = await api.listExternalAgentPresets();
      if (presets.some(p => p.installState === 'installed' && p.agent)) {
        void queryClient.invalidateQueries({ queryKey: externalAgentKeys.list() });
      }
      return presets;
    },
    refetchInterval: query =>
      query.state.data?.some(p => p.installState === 'installing') ? INSTALL_POLL_MS : false,
  });
}

export function useInstallPreset() {
  const queryClient = useQueryClient();
  return useMutation<ExternalAgentPresetStatus, Error, string>({
    mutationFn: id => api.installExternalAgentPreset(id),
    onSuccess: () => refreshExternalAgents(queryClient),
  });
}

/** The agent's readiness: started in its sandbox, handshake answered, signed in. Run on demand. */
export function useExternalAgentCheck(name: string, enabled: boolean) {
  return useQuery<ExternalAgentCheck, Error>({
    queryKey: externalAgentKeys.check(name),
    queryFn: () => api.checkExternalAgent(name),
    enabled: enabled && !!name,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useCreateExternalAgent() {
  const queryClient = useQueryClient();
  return useMutation<ExternalAgent, Error, ExternalAgentInput>({
    mutationFn: input => api.createExternalAgent(input),
    onSuccess: () => refreshExternalAgents(queryClient),
  });
}

export function useUpdateExternalAgent(name: string) {
  const queryClient = useQueryClient();
  return useMutation<ExternalAgent, Error, ExternalAgentInput>({
    mutationFn: input => api.updateExternalAgent(name, input),
    onSuccess: () => refreshExternalAgents(queryClient),
  });
}

export function useDeleteExternalAgent() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: name => api.deleteExternalAgent(name),
    onSuccess: () => refreshExternalAgents(queryClient),
  });
}

export function useSetExternalAgentEnabled(name: string) {
  const queryClient = useQueryClient();
  return useMutation<ExternalAgent, Error, boolean>({
    mutationFn: enabled => api.setExternalAgentEnabled(name, enabled),
    onSuccess: () => refreshExternalAgents(queryClient),
  });
}

export function useExternalAgentLogin(name: string) {
  const queryClient = useQueryClient();
  const status = useQuery<ExternalAgentLogin | null, Error>({
    queryKey: externalAgentKeys.login(name),
    queryFn: async () => {
      try {
        return await api.getExternalAgentLogin(name);
      } catch {
        return null;
      }
    },
    enabled: !!name,
    refetchInterval: query => {
      const state = query.state.data?.state;
      return state === 'running' || state === 'waiting_for_code' ? LOGIN_POLL_MS : false;
    },
  });
  const settle = (login: ExternalAgentLogin) => {
    queryClient.setQueryData(externalAgentKeys.login(name), login);
    if (login.state === 'succeeded') {
      void queryClient.invalidateQueries({ queryKey: externalAgentKeys.check(name) });
    }
  };
  const start = useMutation<ExternalAgentLogin, Error, string>({
    mutationFn: methodId => api.startExternalAgentLogin(name, methodId),
    onSuccess: settle,
  });
  const submit = useMutation<ExternalAgentLogin, Error, string>({
    mutationFn: code => api.submitExternalAgentLoginCode(name, code),
    onSuccess: settle,
  });
  const cancel = useMutation<ExternalAgentLogin, Error, void>({
    mutationFn: () => api.cancelExternalAgentLogin(name),
    onSuccess: settle,
  });
  return { login: status.data ?? null, start, submit, cancel, refetch: status.refetch };
}
