import { useMutation, UseMutationResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { fleetKeys, missionKeys } from '../lib/queryKeys';
import { DispatchRequest, DispatchResult, FleetEntry } from '../lib/types';

export function useFleet() {
  return useQuery<FleetEntry[]>({
    queryKey: fleetKeys.list(),
    queryFn: api.getFleet,
    refetchInterval: 3000,
  });
}

export function useStopInstance(): UseMutationResult<string, Error, string, unknown> {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: instanceId => api.stopInstance(instanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fleetKeys.list() });
    },
  });
}

export type CancelInstanceInput = { instanceId: string; sessionId?: string };

export function useCancelInstance(): UseMutationResult<
  string,
  Error,
  CancelInstanceInput,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation<string, Error, CancelInstanceInput>({
    mutationFn: ({ instanceId, sessionId }) => api.cancelInstance(instanceId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fleetKeys.list() });
    },
  });
}

export function useDispatchMission(): UseMutationResult<
  DispatchResult,
  Error,
  DispatchRequest,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation<DispatchResult, Error, DispatchRequest>({
    mutationFn: req => api.dispatchMission(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fleetKeys.list() });
      queryClient.invalidateQueries({ queryKey: missionKeys.list() });
    },
  });
}
