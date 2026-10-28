import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { providerKeys, setupKeys } from '../lib/queryKeys';
import type { CloudProviderType, ConfigureProviderInput, ProviderLoginStatus } from '../lib/types';

export function useProviderStatus(provider: CloudProviderType) {
  return useQuery({
    queryKey: providerKeys.status(provider),
    queryFn: () => api.getProviderStatus(provider),
    refetchInterval: 15_000,
  });
}

export function useConfigureProvider(provider: CloudProviderType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConfigureProviderInput) => api.configureProvider(provider, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: providerKeys.status(provider),
      });
      queryClient.invalidateQueries({ queryKey: setupKeys.status() });
    },
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
