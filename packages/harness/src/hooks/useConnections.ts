import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { isConnectionBusy } from '../lib/connectionStatus';
import { connectionKeys, setupKeys } from '../lib/queryKeys';
import type {
  Connection,
  CreateConnectionInput,
  PatchConnectionInput,
  ProviderLoginStatus,
} from '../lib/types';

export const CONNECTIONS_POLL_MS = 2000;

/** Refetch interval for the list: fast while any connection is checking or signing in. */
export function connectionsRefetchInterval(data: Connection[] | undefined): number | false {
  return data?.some(isConnectionBusy) ? CONNECTIONS_POLL_MS : false;
}

export function refreshConnections(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: connectionKeys.list() });
  queryClient.invalidateQueries({ queryKey: setupKeys.status() });
}

/** All runtime backends as connections. Polls while one is checking or has a login pending. */
export function useConnections() {
  return useQuery<Connection[], Error>({
    queryKey: connectionKeys.list(),
    queryFn: api.listConnections,
    refetchInterval: query => connectionsRefetchInterval(query.state.data),
  });
}

export function useCreateConnection(providerType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConnectionInput) => api.createConnection(providerType, input),
    onSuccess: () => refreshConnections(queryClient),
  });
}

export function usePatchConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: PatchConnectionInput & { id: string }) =>
      api.patchConnection(id, input),
    onSuccess: () => refreshConnections(queryClient),
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteConnection(id),
    onSuccess: () => refreshConnections(queryClient),
  });
}

/** Runs a discovery cycle now ("Erneut prüfen"); resolves with the refreshed connection. */
export function useCheckConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.checkConnection(id),
    onSettled: () => refreshConnections(queryClient),
  });
}

export function useConnectionLoginStatus(id: string) {
  return useQuery<ProviderLoginStatus, Error>({
    queryKey: connectionKeys.login(id),
    queryFn: () => api.getConnectionLogin(id),
    refetchInterval: query => (query.state.data?.state === 'login_pending' ? 2000 : false),
    retry: false,
  });
}

export function useStartConnectionLogin(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.startConnectionLogin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.login(id) });
      refreshConnections(queryClient);
    },
  });
}

/** Cancels only an in-progress attempt; an established session stays signed in. */
export function useCancelConnectionLogin(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.cancelConnectionLogin(id),
    onSuccess: status => queryClient.setQueryData(connectionKeys.login(id), status),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.login(id) });
      refreshConnections(queryClient);
    },
  });
}

/** Signs out: wipes the stored credential of this connection. */
export function useConnectionLogout(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.logoutConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.login(id) });
      refreshConnections(queryClient);
    },
  });
}
