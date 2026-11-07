import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ConnectorFormValues } from '../lib/connectorForm';
import { mcpInputFromForm, remoteToolsInputFromForm } from '../lib/connectorForm';
import type { Connector, McpServer, RemoteToolsEntry } from '../lib/connectorTypes';
import { ApiError } from '../lib/fetch';
import { connectorKeys } from '../lib/queryKeys';

export function refreshConnectors(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: connectorKeys.all });
}

export function useConnectors() {
  return useQuery<Connector[], Error>({
    queryKey: connectorKeys.list(),
    queryFn: api.listConnectors,
    staleTime: 60_000,
  });
}

export function useCheckConnector() {
  const queryClient = useQueryClient();
  return useMutation<Connector, Error, string>({
    mutationFn: name => api.checkConnector(name),
    onSuccess: checked =>
      queryClient.setQueryData<Connector[]>(connectorKeys.list(), list =>
        list?.map(c => (c.name === checked.name ? checked : c)),
      ),
  });
}

export function useMcpServer(id: string | undefined) {
  return useQuery<McpServer, Error>({
    queryKey: connectorKeys.mcp(id ?? ''),
    queryFn: () => api.getMcpServer(id!),
    enabled: !!id,
  });
}

export function useRemoteTools(id: string | undefined) {
  return useQuery<RemoteToolsEntry, Error>({
    queryKey: connectorKeys.remote(id ?? ''),
    queryFn: () => api.getRemoteTools(id!),
    enabled: !!id,
  });
}

const CHECK_ATTEMPTS = 16;
const CHECK_DELAY_MS = 500;

async function checkAfterSave(name: string): Promise<Connector> {
  let last: Connector | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt < CHECK_ATTEMPTS; attempt++) {
    try {
      last = await api.checkConnector(name);
      if (last.status !== 'unavailable' || attempt >= 3) return last;
    } catch (err) {
      lastError = err;
      if (!(err instanceof ApiError) || err.status !== 404) throw err;
    }
    await new Promise(resolve => setTimeout(resolve, CHECK_DELAY_MS));
  }
  if (last) return last;
  throw lastError;
}

export type SaveConnectorArgs = {
  values: ConnectorFormValues;
  existing?: Pick<Connector, 'id' | 'kind'>;
};

export function useSaveConnector() {
  const queryClient = useQueryClient();
  return useMutation<Connector, Error, SaveConnectorArgs>({
    mutationFn: async ({ values, existing }) => {
      if (values.kind === 'openapi') {
        const input = remoteToolsInputFromForm(values);
        if (existing?.id) await api.updateRemoteTools(existing.id, input);
        else await api.createRemoteTools(input);
      } else {
        const input = mcpInputFromForm(values);
        if (existing?.id) await api.updateMcpServer(existing.id, input);
        else await api.createMcpServer(input);
      }
      return checkAfterSave(values.name.trim());
    },
    onSettled: () => refreshConnectors(queryClient),
  });
}

export function useRemoveConnector() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, Connector>({
    mutationFn: async c => {
      if (!c.id) return;
      if (c.kind === 'openapi') await api.deleteRemoteTools(c.id);
      else await api.deleteMcpServer(c.id);
    },
    onSuccess: () => refreshConnectors(queryClient),
  });
}

export function useStartMcpSignIn() {
  return useMutation<string, Error, string>({
    mutationFn: async id => {
      const { authorizationUrl } = await api.startMcpOAuth(id, window.location.origin);
      window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
      return authorizationUrl;
    },
  });
}
