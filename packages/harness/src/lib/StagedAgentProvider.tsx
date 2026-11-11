import { useMemo, useState, type ReactNode } from 'react';
import { StagedAgentContext, type StagedAgentContextValue } from './stagedAgent';

export function StagedAgentProvider({ children }: { children: ReactNode }) {
  const [stagedAgent, setStagedAgent] = useState<string | null>(null);
  const value = useMemo<StagedAgentContextValue>(
    () => ({ stagedAgent, setStagedAgent }),
    [stagedAgent],
  );
  return <StagedAgentContext.Provider value={value}>{children}</StagedAgentContext.Provider>;
}
