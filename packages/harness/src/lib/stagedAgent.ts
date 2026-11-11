import { createContext, useContext } from 'react';

export interface StagedAgentContextValue {
  stagedAgent: string | null;
  setStagedAgent: (name: string | null) => void;
}

export const StagedAgentContext = createContext<StagedAgentContextValue | null>(null);

export function useStagedAgent(): StagedAgentContextValue {
  return useContext(StagedAgentContext) ?? NOOP_STAGED_AGENT;
}

const NOOP_STAGED_AGENT: StagedAgentContextValue = {
  stagedAgent: null,
  setStagedAgent: () => {},
};
