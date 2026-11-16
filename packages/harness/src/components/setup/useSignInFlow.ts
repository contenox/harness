import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePutCLIConfig } from '../../hooks/usePutCLIConfig';
import { useRefreshSetupStatus } from '../../hooks/useRefreshSetupStatus';
import { api } from '../../lib/api';
import { onlyDefaultsMissing, planDefaultSelection } from '../../lib/defaultModel';
import { verifyProviderSignIn } from '../../lib/signInVerify';
import type { CloudProviderType, Connection, SetupStatus } from '../../lib/types';

export const CODEX: CloudProviderType = 'openai-codex';
const POLL_MS = 3000;
const MODEL_WAIT_MS = 30_000;

export type SignInView = 'codex' | 'others';

/**
 * State machine behind the sign-in screen: which panel is shown and, once a provider is
 * connected and verified, picking its default provider + model.
 */
export function useSignInFlow(data: SetupStatus | undefined) {
  const [view, setView] = useState<SignInView>('codex');
  const [readyProvider, setReadyProvider] = useState<string | undefined>();
  const [readyConnectionId, setReadyConnectionId] = useState<string | undefined>();
  const [timedOut, setTimedOut] = useState(false);
  const refresh = useRefreshSetupStatus();
  const putConfig = usePutCLIConfig();
  const attempted = useRef<string | null>(null);
  const { mutate: refreshStatus } = refresh;

  const finishing = readyProvider !== undefined || onlyDefaultsMissing(data);
  const plan = useMemo(
    () => (finishing ? planDefaultSelection(data, readyProvider, readyConnectionId) : null),
    [finishing, data, readyProvider, readyConnectionId],
  );

  const markReady = useCallback(
    (provider: string, connectionId?: string) => {
      setTimedOut(false);
      setReadyConnectionId(connectionId);
      setReadyProvider(provider);
      // The connection was just verified, so one refresh brings in its models.
      refreshStatus();
    },
    [refreshStatus],
  );

  /** A provider from the list was saved and verified available. */
  const onConnected = useCallback(
    (connection: Connection) => markReady(connection.providerType, connection.id),
    [markReady],
  );

  /** ChatGPT signed in: run the discovery check first, then continue to the model step. */
  const onCodexSignedIn = useCallback(() => {
    void verifyProviderSignIn(
      { list: api.listConnections, check: api.checkConnection },
      CODEX,
    ).then(connection => markReady(CODEX, connection?.id));
  }, [markReady]);

  // Verification (the connection check) already refreshed the runtime, so one refresh on
  // markReady is enough. Polling remains only as a fallback while the default model step waits
  // for chat models to show up in the setup status (e.g. a first-run state that was already
  // "only defaults missing", or a slow provider cycle).
  useEffect(() => {
    if (!finishing || plan) return;
    refreshStatus();
    const timer = window.setInterval(() => refreshStatus(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [finishing, plan, refreshStatus]);

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
    onConnected,
    onCodexSignedIn,
    checkAgain,
    checking: refresh.isPending,
  };
}
