import { createContext, useContext } from 'react';

export interface StagedRootContextValue {
  stagedRoot: string | null;
  setStagedRoot: (cwd: string | null) => void;
}

export const StagedRootContext = createContext<StagedRootContextValue | null>(null);

export function useStagedRoot(): StagedRootContextValue {
  return useContext(StagedRootContext) ?? NOOP_STAGED_ROOT;
}

const NOOP_STAGED_ROOT: StagedRootContextValue = {
  stagedRoot: null,
  setStagedRoot: () => {},
};
