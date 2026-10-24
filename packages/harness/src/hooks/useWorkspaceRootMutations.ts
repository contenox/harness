import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { workspaceRootKeys } from '../lib/queryKeys';

export function useAddWorkspaceRoot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { path: string; name: string }) => api.addWorkspaceRoot(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceRootKeys.all });
    },
  });
}

export function useForgetWorkspaceRoot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => api.removeWorkspaceRoot(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceRootKeys.all });
    },
  });
}
