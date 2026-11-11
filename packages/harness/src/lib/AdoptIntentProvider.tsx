import { useMemo, useState, type ReactNode } from 'react';
import { AdoptIntentContext, type AdoptIntent, type AdoptIntentContextValue } from './adoptIntent';

export function AdoptIntentProvider({ children }: { children: ReactNode }) {
  const [adoptIntent, setAdoptIntent] = useState<AdoptIntent | null>(null);
  const value = useMemo<AdoptIntentContextValue>(
    () => ({ adoptIntent, setAdoptIntent }),
    [adoptIntent],
  );
  return <AdoptIntentContext.Provider value={value}>{children}</AdoptIntentContext.Provider>;
}
