import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { connectionKeys, providerKeys, setupKeys } from '../lib/queryKeys';
import type { CloudProviderType, ProviderLoginStatus } from '../lib/types';

export function useProviderStatus(provider: CloudProviderType) {
  return useQuery({
    queryKey: providerKeys.status(provider),
    queryFn: () => api.getProviderStatus(provider),
    refetchInterval: 15_000,
  });
}

export function useStartProviderLogin(provider: CloudProviderType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.startProviderLogin(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.login(provider) });
      queryClient.invalidateQueries({ queryKey: providerKeys.status(provider) });
    },
  });
}

/** Cancels only an in-progress device-code attempt; stored credentials are untouched. */
export function useCancelProviderLogin(provider: CloudProviderType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.cancelProviderLogin(provider),
    onSuccess: status => queryClient.setQueryData(providerKeys.login(provider), status),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.login(provider) });
      queryClient.invalidateQueries({ queryKey: providerKeys.status(provider) });
      queryClient.invalidateQueries({ queryKey: connectionKeys.list() });
    },
  });
}

export function useProviderLoginStatus(provider: CloudProviderType) {
  return useQuery<ProviderLoginStatus, Error>({
    queryKey: providerKeys.login(provider),
    queryFn: () => api.getProviderLogin(provider),
    refetchInterval: query => (query.state.data?.state === 'login_pending' ? 2000 : false),
    retry: false,
  });
}

export function useProviderLogout(provider: CloudProviderType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.logoutProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.login(provider) });
      queryClient.invalidateQueries({ queryKey: providerKeys.status(provider) });
      queryClient.invalidateQueries({ queryKey: setupKeys.status() });
    },
  });
}
