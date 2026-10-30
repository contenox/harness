import type { CloudProviderSetup } from './providerCatalog';
import {
  buildConnectionPayload,
  mapSetupError,
  validateSetupValues,
  type FieldErrors,
  type ProviderSetupValues,
} from './providerSetupValues';
import type { Connection, CreateConnectionInput, PatchConnectionInput } from './types';

export type SetupPhase = 'idle' | 'editing' | 'saving' | 'verifying' | 'success' | 'error';

export type SetupError = {
  /** Where it failed: while saving the connection or while verifying it. */
  stage: 'save' | 'verify';
  /** Runtime error code (see backendErrors); absent for unclassified failures. */
  code?: string;
  /** Raw text for technical details or a form-level message. */
  message?: string;
};

export type SetupState = {
  phase: SetupPhase;
  connection?: Connection;
  fieldErrors: FieldErrors;
  error?: SetupError;
};

export type SetupEvent =
  | { type: 'edit' }
  | { type: 'saving' }
  | { type: 'verifying'; connection: Connection }
  | { type: 'success'; connection: Connection }
  | {
      type: 'failed';
      error: SetupError;
      fieldErrors?: FieldErrors;
      connection?: Connection;
    }
  | { type: 'reset' };

export const initialSetupState: SetupState = { phase: 'idle', fieldErrors: {} };

export function setupReducer(state: SetupState, event: SetupEvent): SetupState {
  switch (event.type) {
    case 'edit':
      // Typing never interrupts work in flight.
      if (state.phase === 'saving' || state.phase === 'verifying') return state;
      return { ...state, phase: 'editing', error: undefined, fieldErrors: {} };
    case 'saving':
      return { ...state, phase: 'saving', error: undefined, fieldErrors: {} };
    case 'verifying':
      return { ...state, phase: 'verifying', connection: event.connection, error: undefined };
    case 'success':
      return { phase: 'success', connection: event.connection, fieldErrors: {} };
    case 'failed':
      return {
        phase: 'error',
        connection: event.connection ?? state.connection,
        fieldErrors: event.fieldErrors ?? {},
        error: event.error,
      };
    case 'reset':
      return initialSetupState;
  }
}

/** True while the form should not accept edits or another submit. */
export const isSetupBusy = (state: SetupState): boolean =>
  state.phase === 'saving' || state.phase === 'verifying';

export type SetupDeps = {
  create(providerType: string, input: CreateConnectionInput): Promise<Connection>;
  patch(id: string, input: PatchConnectionInput): Promise<Connection>;
  check(id: string): Promise<Connection>;
  /** Current state of one connection (from the list), if it still exists. */
  get(id: string): Promise<Connection | undefined>;
  sleep(ms: number): Promise<void>;
  now(): number;
};

export const VERIFY_TIMEOUT_MS = 30_000;
export const VERIFY_POLL_MS = 1_000;

type RunCommon = {
  deps: SetupDeps;
  dispatch(event: SetupEvent): void;
  /** Return true once the owner reset or unmounted; nothing is dispatched afterwards. */
  isCancelled(): boolean;
  timeoutMs?: number;
  pollMs?: number;
};

type Outcome = 'available' | 'failed' | 'pending';

function outcomeOf(connection: Connection): Outcome {
  if (connection.health === 'available') return 'available';
  if (
    connection.health === 'unavailable' ||
    connection.errorCode ||
    connection.authState === 'login_required' ||
    connection.authState === 'refresh_required'
  ) {
    return 'failed';
  }
  return 'pending';
}

function errorCodeOf(connection: Connection): string | undefined {
  if (connection.errorCode) return connection.errorCode;
  if (connection.authState === 'login_required' || connection.authState === 'refresh_required') {
    return 'login_required';
  }
  return undefined;
}

/**
 * Runs the runtime's discovery cycle for a saved connection and waits until it is available or
 * has an error. Success is only reported here, never right after saving.
 */
export async function verifyConnection(
  common: RunCommon & { connection: Connection },
): Promise<Connection | undefined> {
  const { deps, dispatch, isCancelled, timeoutMs = VERIFY_TIMEOUT_MS, pollMs = VERIFY_POLL_MS } =
    common;
  let connection = common.connection;
  if (isCancelled()) return undefined;
  dispatch({ type: 'verifying', connection });
  const deadline = deps.now() + timeoutMs;

  try {
    connection = await deps.check(connection.id);
  } catch (error) {
    if (isCancelled()) return undefined;
    dispatch({
      type: 'failed',
      connection,
      error: {
        stage: 'verify',
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return undefined;
  }

  for (;;) {
    if (isCancelled()) return undefined;
    const outcome = outcomeOf(connection);
    if (outcome === 'available') {
      dispatch({ type: 'success', connection });
      return connection;
    }
    if (outcome === 'failed') {
      dispatch({
        type: 'failed',
        connection,
        error: { stage: 'verify', code: errorCodeOf(connection), message: connection.error },
      });
      return undefined;
    }
    if (deps.now() >= deadline) {
      dispatch({
        type: 'failed',
        connection,
        error: { stage: 'verify', code: 'unreachable', message: connection.error },
      });
      return undefined;
    }
    await deps.sleep(pollMs);
    try {
      connection = (await deps.get(connection.id)) ?? connection;
    } catch {
      // A failed poll is retried until the deadline.
    }
  }
}

/** Saves (create, or patch when `connectionId` is given) and then verifies. */
export async function runSetup(
  common: RunCommon & {
    setup: CloudProviderSetup;
    connectionId?: string;
    values: ProviderSetupValues;
    secretStored?: boolean;
  },
): Promise<Connection | undefined> {
  const { deps, dispatch, isCancelled, setup, connectionId, values } = common;

  const invalid = validateSetupValues(setup, values, { secretStored: !!common.secretStored });
  if (Object.keys(invalid).length > 0) {
    dispatch({
      type: 'failed',
      fieldErrors: invalid,
      error: { stage: 'save' },
    });
    return undefined;
  }

  dispatch({ type: 'saving' });
  const payload = buildConnectionPayload(values);
  let saved: Connection;
  try {
    saved = connectionId
      ? await deps.patch(connectionId, payload)
      : await deps.create(setup.provider, payload);
  } catch (error) {
    if (isCancelled()) return undefined;
    const mapped = mapSetupError(error, setup);
    dispatch({
      type: 'failed',
      fieldErrors: mapped.fieldErrors,
      error: { stage: 'save', message: mapped.message },
    });
    return undefined;
  }
  return verifyConnection({ ...common, connection: saved });
}
