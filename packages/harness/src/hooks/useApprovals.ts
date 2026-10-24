import {
  useMutation,
  UseMutationResult,
  useQueries,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import { approvalKeys, fleetKeys, missionKeys } from '../lib/queryKeys';
import { HITLApproval, Mission, MissionReport } from '../lib/types';
import {
  joinInboxReports,
  mergeOperatorInboxReports,
  missionsById,
  type InboxReportItem,
} from '../pages/admin/inbox/inboxPresentation';
import { useMissions } from './useMissions';
import { useOperatorInbox } from './useOperatorInbox';

export function useApprovals(): UseQueryResult<HITLApproval[], Error> {
  return useQuery<HITLApproval[], Error>({
    queryKey: approvalKeys.list(),
    queryFn: () => api.listApprovals(),
    refetchInterval: 3000,
  });
}

export type AnswerApprovalInput = { id: string; approved: boolean };

export function useAnswerApproval(): UseMutationResult<
  string,
  Error,
  AnswerApprovalInput,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation<string, Error, AnswerApprovalInput>({
    mutationFn: ({ id, approved }) => api.answerApproval(id, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.list() });
      queryClient.invalidateQueries({ queryKey: fleetKeys.list() });
      queryClient.invalidateQueries({ queryKey: missionKeys.list() });
    },
  });
}

export function useReplyToAsk(): UseMutationResult<string, Error, { id: string; answer: string }> {
  const queryClient = useQueryClient();
  return useMutation<string, Error, { id: string; answer: string }>({
    mutationFn: ({ id, answer }) => api.replyToAsk(id, answer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.list() });
      queryClient.invalidateQueries({ queryKey: fleetKeys.list() });
      queryClient.invalidateQueries({ queryKey: missionKeys.list() });
    },
  });
}

export function useInboxReports(limit?: number): {
  items: InboxReportItem[];
  isLoading: boolean;
  error: Error | null;
} {
  const missionsQuery = useMissions();
  const missions: Mission[] = missionsQuery.data ?? [];

  const reportQueries = useQueries({
    queries: missions.map(m => ({
      queryKey: missionKeys.reports(m.id),
      queryFn: () => api.listMissionReports(m.id),
      refetchInterval: 5000,
    })),
  });

  const reportsByMissionId = new Map<string, MissionReport[]>();
  missions.forEach((m, i) => {
    const data = reportQueries[i]?.data;
    if (data) reportsByMissionId.set(m.id, data);
  });

  const joined = joinInboxReports(missions, reportsByMissionId, limit);

  const operatorInboxQuery = useOperatorInbox();
  const items = mergeOperatorInboxReports(joined, operatorInboxQuery.data, missionsById(missions));

  const isLoading =
    missionsQuery.isLoading || (missions.length > 0 && reportQueries.some(q => q.isLoading));
  const error = missionsQuery.error ?? null;

  return { items, isLoading, error };
}
