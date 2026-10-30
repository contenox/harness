import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { api } from '../lib/api';
import type { CloudProviderSetup } from '../lib/providerCatalog';
import {
  initialSetupState,
  isSetupBusy,
  runSetup,
  setupReducer,
  verifyConnection,
  type SetupDeps,
  type SetupError,
  type SetupPhase,
} from '../lib/providerSetupFlow';
import type { FieldErrors, ProviderSetupValues } from '../lib/providerSetupValues';
import type { Connection } from '../lib/types';
import { refreshConnections } from './useConnections';

export type UseProviderSetupOptions = {
  setup: CloudProviderSetup;
  /** Edit this connection (patch) instead of creating a new one. */
  connection?: Connection;
  /** Called once a connection has been saved AND verified as available. */
  onVerified?: (connection: Connection) => void;
};

export type ProviderSetupController = {
  phase: SetupPhase;
  /** The saved connection (created or edited) once there is one; carries health and errorCode. */
  connection: Connection | undefined;
  fieldErrors: FieldErrors;
  error: SetupError | undefined;
  busy: boolean;
  /** Save (create, or patch when editing) and verify. Resolves after the attempt ends. */
  configure: (values: ProviderSetupValues) => Promise<void>;
  /** Repeat the failed step: re-check after a verify failure, re-save after a save failure. */
  retry: () => Promise<void>;
  /** The user changed the draft: leaves a previous error state. */
  edit: () => void;
  /** Abandon the attempt and return to idle. */
  reset: () => void;
};

function realDeps(): SetupDeps {
  return {
    create: api.createConnection,
    patch: api.patchConnection,
    check: api.checkConnection,
    get: async id => (await api.listConnections()).find(c => c.id === id),
    sleep: ms => new Promise(resolve => window.setTimeout(resolve, ms)),
    now: () => Date.now(),
  };
}

/**
 * The shared "configure a provider" operation: save -> verify -> success | error.
 * Success is reported only after the runtime says the connection is available; saving alone
 * never counts. Context (first run, settings, repair) decides what happens in `onVerified`.
 */
export function useProviderSetup({
  setup,
  connection,
  onVerified,
}: UseProviderSetupOptions): ProviderSetupController {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(setupReducer, initialSetupState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const runRef = useRef(0);
  const lastValues = useRef<ProviderSetupValues | undefined>(undefined);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;
  const deps = useMemo(realDeps, []);

  useEffect(
    () => () => {
      runRef.current += 1;
    },
    [],
  );

  const settle = useCallback(
    (result: Connection | undefined) => {
      // The connection may exist even when verification failed, so the list always refreshes.
      refreshConnections(queryClient);
      if (result) onVerifiedRef.current?.(result);
    },
    [queryClient],
  );

  const common = useCallback(() => {
    const run = ++runRef.current;
    return { deps, dispatch, isCancelled: () => runRef.current !== run };
  }, [deps]);

  const configure = useCallback(
    async (values: ProviderSetupValues) => {
      if (isSetupBusy(stateRef.current)) return;
      lastValues.current = values;
      const saved = connection ?? stateRef.current.connection;
      const result = await runSetup({
        ...common(),
        setup,
        values,
        connectionId: saved?.id,
        secretStored: saved?.secretConfigured,
      });
      settle(result);
    },
    [common, connection, setup, settle],
  );

  const retry = useCallback(async () => {
    const current = stateRef.current;
    if (isSetupBusy(current)) return;
    if (current.error?.stage === 'verify' && current.connection) {
      settle(await verifyConnection({ ...common(), connection: current.connection }));
    } else if (lastValues.current) {
      await configure(lastValues.current);
    }
  }, [common, configure, settle]);

  const reset = useCallback(() => {
    runRef.current += 1;
    lastValues.current = undefined;
    dispatch({ type: 'reset' });
  }, []);

  const edit = useCallback(() => dispatch({ type: 'edit' }), []);

  return {
    phase: state.phase,
    connection: state.connection,
    fieldErrors: state.fieldErrors,
    error: state.error,
    busy: isSetupBusy(state),
    configure,
    retry,
    edit,
    reset,
  };
}
