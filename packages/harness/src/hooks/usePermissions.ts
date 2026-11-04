import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConfigDocument,
  getEnvelopes,
  listLocalToolsets,
  removeEnvelope,
  saveWorkspaceAware,
  scopeKey,
  type ConfigDocument,
  type ConfigScope,
  type EnvelopeItem,
  type EnvelopeSection,
  type LocalToolset,
} from '../lib/agentsConfig';
import { agentsConfigKeys, envelopeKeys, workspaceAccessKeys } from '../lib/queryKeys';

export function useEnvelopeSection(scope: ConfigScope) {
  return useQuery<EnvelopeSection, Error>({
    queryKey: agentsConfigKeys.envelopes(scopeKey(scope)),
    queryFn: () => getEnvelopes(scope),
    refetchOnWindowFocus: true,
  });
}

export function useConfigDocument(scope: ConfigScope) {
  return useQuery<ConfigDocument, Error>({
    queryKey: agentsConfigKeys.document(scopeKey(scope)),
    queryFn: () => getConfigDocument(scope),
    refetchOnWindowFocus: true,
  });
}

export function useLocalToolsets(scope: ConfigScope) {
  return useQuery<LocalToolset[], Error>({
    queryKey: agentsConfigKeys.toolsets(scopeKey(scope)),
    queryFn: () => listLocalToolsets(scope),
    staleTime: 60_000,
  });
}

function useInvalidatePermissions() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: agentsConfigKeys.all });
    void queryClient.invalidateQueries({ queryKey: envelopeKeys.all });
    void queryClient.invalidateQueries({ queryKey: workspaceAccessKeys.all });
  };
}

type SaveInput = { name: string; patch: Record<string, unknown> };

export function useSaveEnvelope(scope: ConfigScope, section: EnvelopeSection | undefined) {
  const invalidate = useInvalidatePermissions();
  return useMutation<EnvelopeItem, Error, SaveInput>({
    mutationFn: ({ name, patch }) => {
      const item = section?.items?.find(i => i.name === name);
      return saveWorkspaceAware(scope, name, patch, {
        inLayer: item?.inLayer ?? false,
        revision: section?.revision ?? '',
      });
    },
    onSettled: invalidate,
  });
}

export function useRemoveEnvelope(scope: ConfigScope, section: EnvelopeSection | undefined) {
  const invalidate = useInvalidatePermissions();
  return useMutation<void, Error, string>({
    mutationFn: name => removeEnvelope(scope, name, section?.revision ?? ''),
    onSettled: invalidate,
  });
}
