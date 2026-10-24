import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface StagedRootContextValue {
  stagedRoot: string | null;
  setStagedRoot: (cwd: string | null) => void;
}

const StagedRootContext = createContext<StagedRootContextValue | null>(null);

export function StagedRootProvider({ children }: { children: ReactNode }) {
  const [stagedRoot, setStagedRoot] = useState<string | null>(null);
  const value = useMemo<StagedRootContextValue>(
    () => ({ stagedRoot, setStagedRoot }),
    [stagedRoot],
  );
  return <StagedRootContext.Provider value={value}>{children}</StagedRootContext.Provider>;
}

export function useStagedRoot(): StagedRootContextValue {
  return useContext(StagedRootContext) ?? NOOP_STAGED_ROOT;
}

const NOOP_STAGED_ROOT: StagedRootContextValue = {
  stagedRoot: null,
  setStagedRoot: () => {},
};
