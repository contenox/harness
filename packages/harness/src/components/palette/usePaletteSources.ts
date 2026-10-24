import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAcpWorkspace } from '../../hooks/useAcpWorkspace';
import { startAdoptSession, useAdoptIntent } from '../../lib/adoptIntent';
import {
  agentKeys,
  approvalKeys,
  fleetKeys,
  missionKeys,
  workspaceRootKeys,
} from '../../lib/queryKeys';
import { buildPaletteItems } from '../../lib/palette/providers';
import type { PaletteItem } from '../../lib/palette/types';
import type { Agent, FleetEntry, HITLApproval, Mission, WorkspaceRoot } from '../../lib/types';

export function usePaletteSources(open: boolean): PaletteItem[] {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setAdoptIntent } = useAdoptIntent();
  const { workspace } = useAcpWorkspace();
  const sessions = workspace.sessions;

  return useMemo<PaletteItem[]>(() => {
    if (!open) return [];
    return buildPaletteItems({
      t,
      navigate,
      startAdopt: ref => startAdoptSession(ref, { setAdoptIntent, navigate }),
      missions: queryClient.getQueryData<Mission[]>(missionKeys.list()) ?? [],
      fleet: queryClient.getQueryData<FleetEntry[]>(fleetKeys.list()) ?? [],
      agents: readAgentsFromCache(queryClient),
      approvals: queryClient.getQueryData<HITLApproval[]>(approvalKeys.list()) ?? [],
      sessions,
      workspaceRoots: readWorkspaceRootsFromCache(queryClient),
    });
  }, [open, t, navigate, setAdoptIntent, queryClient, sessions]);
}

function readAgentsFromCache(queryClient: QueryClient): Agent[] {
  const entries = queryClient.getQueriesData<Agent[]>({ queryKey: agentKeys.all });
  for (const [, data] of entries) if (Array.isArray(data) && data.length > 0) return data;
  for (const [, data] of entries) if (Array.isArray(data)) return data;
  return [];
}

function readWorkspaceRootsFromCache(queryClient: QueryClient): WorkspaceRoot[] {
  const data = queryClient.getQueryData<WorkspaceRoot[] | null>(workspaceRootKeys.list());
  return Array.isArray(data) ? data : [];
}
