import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface StagedAgentContextValue {
  stagedAgent: string | null;
  setStagedAgent: (name: string | null) => void;
}

const StagedAgentContext = createContext<StagedAgentContextValue | null>(null);

export function StagedAgentProvider({ children }: { children: ReactNode }) {
  const [stagedAgent, setStagedAgent] = useState<string | null>(null);
  const value = useMemo<StagedAgentContextValue>(
    () => ({ stagedAgent, setStagedAgent }),
    [stagedAgent],
  );
  return <StagedAgentContext.Provider value={value}>{children}</StagedAgentContext.Provider>;
}

export function useStagedAgent(): StagedAgentContextValue {
  return useContext(StagedAgentContext) ?? NOOP_STAGED_AGENT;
}

const NOOP_STAGED_AGENT: StagedAgentContextValue = {
  stagedAgent: null,
  setStagedAgent: () => {},
};
