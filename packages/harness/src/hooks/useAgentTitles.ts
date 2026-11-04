import { useCallback, useMemo } from 'react';
import { useExternalAgents } from './useExternalAgents';

export function useAgentTitles() {
  const { data } = useExternalAgents();
  const titles = useMemo(() => new Map((data ?? []).map(a => [a.name, a.title || a.name])), [data]);
  return useCallback((name: string | null | undefined) => (name ? (titles.get(name) ?? name) : null), [titles]);
}
