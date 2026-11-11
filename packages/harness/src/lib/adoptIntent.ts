import { createContext, useContext } from 'react';

export type AdoptIntent = {
  instanceId: string;
  sessionId: string;
  cwd?: string;
  title?: string;
};

export interface AdoptIntentContextValue {
  adoptIntent: AdoptIntent | null;
  setAdoptIntent: (intent: AdoptIntent | null) => void;
}

export const AdoptIntentContext = createContext<AdoptIntentContextValue | null>(null);

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
