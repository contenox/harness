import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePutCLIConfig } from '../../hooks/usePutCLIConfig';
import { useRefreshSetupStatus } from '../../hooks/useRefreshSetupStatus';
import { onlyDefaultsMissing, planDefaultSelection } from '../../lib/defaultModel';
import type { CloudProviderType, SetupStatus } from '../../lib/types';

export const CODEX: CloudProviderType = 'openai-codex';
const POLL_MS = 3000;
const MODEL_WAIT_MS = 30_000;

export type SignInView = 'codex' | 'others';

/**
 * State machine behind the sign-in screen: which panel is shown, polling the setup status
 * while a provider is being connected, and picking the default provider + model once one is ready.
 */
export function useSignInFlow(data: SetupStatus | undefined) {
  const [view, setView] = useState<SignInView>('codex');
  const [readyProvider, setReadyProvider] = useState<string | undefined>();
  const [timedOut, setTimedOut] = useState(false);
  const refresh = useRefreshSetupStatus();
  const putConfig = usePutCLIConfig();
  const attempted = useRef<string | null>(null);

  const finishing = readyProvider !== undefined || onlyDefaultsMissing(data);
  const plan = useMemo(
    () => (finishing ? planDefaultSelection(data, readyProvider) : null),
    [finishing, data, readyProvider],
  );

  const markReady = useCallback((provider: string) => {
    setTimedOut(false);
    setReadyProvider(provider);
  }, []);
  const onCodexSignedIn = useCallback(() => markReady(CODEX), [markReady]);

  const { mutate: refreshStatus } = refresh;
  const polling = finishing || view === 'others';
  useEffect(() => {
    if (!polling) return;
    refreshStatus();
    const timer = window.setInterval(() => refreshStatus(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [polling, refreshStatus]);

  useEffect(() => {
    if (!finishing || plan) return;
    const timer = window.setTimeout(() => setTimedOut(true), MODEL_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [finishing, plan, readyProvider]);

  const { mutate: saveConfig } = putConfig;
  useEffect(() => {
    if (!plan) return;
    const key = `${plan.provider}/${plan.model}`;
    if (attempted.current === key) return;
    attempted.current = key;
    saveConfig({ 'default-model': plan.model, 'default-provider': plan.provider });
  }, [plan, saveConfig]);

  const showManual = finishing && (putConfig.isError || (!plan && timedOut));
  const showWorking = finishing && !showManual;

  const checkAgain = () => {
    setTimedOut(false);
    attempted.current = null;
    putConfig.reset();
    refreshStatus();
  };

  return {
    view,
    setView,
    finishing,
    showWorking,
    showManual,
    readyProvider,
    markReady,
    onCodexSignedIn,
    checkAgain,
    checking: refresh.isPending,
  };
}
