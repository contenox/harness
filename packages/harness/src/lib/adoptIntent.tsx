import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type AdoptIntent = {
  instanceId: string;
  sessionId: string;
  cwd?: string;
};

export interface AdoptIntentContextValue {
  adoptIntent: AdoptIntent | null;
  setAdoptIntent: (intent: AdoptIntent | null) => void;
}

const AdoptIntentContext = createContext<AdoptIntentContextValue | null>(null);

export function AdoptIntentProvider({ children }: { children: ReactNode }) {
  const [adoptIntent, setAdoptIntent] = useState<AdoptIntent | null>(null);
  const value = useMemo<AdoptIntentContextValue>(
    () => ({ adoptIntent, setAdoptIntent }),
    [adoptIntent],
  );
  return <AdoptIntentContext.Provider value={value}>{children}</AdoptIntentContext.Provider>;
}

export function useAdoptIntent(): AdoptIntentContextValue {
  return useContext(AdoptIntentContext) ?? NOOP_ADOPT_INTENT;
}

const NOOP_ADOPT_INTENT: AdoptIntentContextValue = {
  adoptIntent: null,
  setAdoptIntent: () => {},
};

export interface StartAdoptDeps {
  setAdoptIntent: (intent: AdoptIntent) => void;
  navigate: (to: string) => void;
}

export function startAdoptSession(intent: AdoptIntent, deps: StartAdoptDeps): void {
  deps.setAdoptIntent(intent);
  deps.navigate('/chat');
}
