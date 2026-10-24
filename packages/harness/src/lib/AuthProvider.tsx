import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useMemo } from 'react';
import { api } from './api';
import { AuthContext } from './authContext';
import { authKeys } from './queryKeys';
import type { AuthenticatedUser } from './types';

const localUser: AuthenticatedUser = {
  id: 'local-user',
  subject: 'local-user',
  email: 'local@localhost',
  friendlyName: 'Local user',
  username: 'local-user',
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: authKeys.status(),
    queryFn: api.getAuthStatus,
    staleTime: 0,
    retry: false,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: authKeys.status() });
  }, [queryClient]);

  const value = useMemo(() => {
    const authRequired = isError ? true : (data?.required ?? false);
    const authenticated = isError ? false : (data?.authenticated ?? false);
    const granted = !authRequired || authenticated;
    return {
      user: granted ? localUser : undefined,
      isLoading,
      isError,
      error: error instanceof Error ? error : null,
      authRequired,
      authenticated,
      refresh,
    };
  }, [data, isLoading, isError, error, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
