import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import { missionKeys } from '../lib/queryKeys';
import { Mission, MissionReport } from '../lib/types';

export function useMissions(): UseQueryResult<Mission[], Error> {
  return useQuery<Mission[], Error>({
    queryKey: missionKeys.list(),
    queryFn: () => api.listMissions(),
    refetchInterval: 5000,
  });
}

export function useMission(id: string): UseQueryResult<Mission, Error> {
  return useQuery<Mission, Error>({
    queryKey: missionKeys.detail(id),
    queryFn: () => api.getMission(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useMissionReports(missionId: string): UseQueryResult<MissionReport[], Error> {
  return useQuery<MissionReport[], Error>({
    queryKey: missionKeys.reports(missionId),
    queryFn: () => api.listMissionReports(missionId),
    enabled: !!missionId,
    refetchInterval: 5000,
  });
}
