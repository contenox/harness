import { useMemo, useState, type ReactNode } from 'react';
import { StagedRootContext, type StagedRootContextValue } from './stagedRoot';

export function StagedRootProvider({ children }: { children: ReactNode }) {
  const [stagedRoot, setStagedRoot] = useState<string | null>(null);
  const value = useMemo<StagedRootContextValue>(
    () => ({ stagedRoot, setStagedRoot }),
    [stagedRoot],
  );
  return <StagedRootContext.Provider value={value}>{children}</StagedRootContext.Provider>;
}
