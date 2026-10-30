import type { AcpFailureKind } from './acpFailureKind';
import { needsRecovery, recoveryCodeOf } from './backendErrors';
import type { Backend, Connection, SetupStatus } from './types';

/** Setup issue codes that mean the default model (not the connection) is the problem. */
const MODEL_ISSUES = new Set([
  'missing_default_model',
  'missing_default_provider',
  'default_model_not_available',
]);

/** Failure kinds a connection recovery card can explain; everything else keeps its own UI. */
export function isRecoverableFailure(kind: AcpFailureKind): boolean {
  return kind === 'backend_unreachable' || kind === 'model_unavailable';
}

/** The error code to show when the connection itself has none (a failed turn, a setup issue). */
export function fallbackCodeFor(kind: AcpFailureKind, issueCode?: string): string | undefined {
  if (issueCode && MODEL_ISSUES.has(issueCode)) return 'model_unavailable';
  if (kind === 'backend_unreachable') return 'unreachable';
  if (kind === 'model_unavailable') return 'model_unavailable';
  return undefined;
}

/** The connection with the code recovery is chosen by: its own state first, else the fallback. */
export function withFallbackCode(connection: Connection, fallback?: string): Connection {
  const code = recoveryCodeOf(connection) ?? fallback;
  return code === connection.errorCode ? connection : { ...connection, errorCode: code };
}

/**
 * Finds the connection a failure most likely belongs to, in this order:
 * 1. a connection whose name appears in the failure text (when exactly one does),
 * 2. the backend flagged as default provider by the setup status, else the connections of the
 *    default provider type (the one that needs attention first),
 * 3. with no default provider: the only connection that needs attention.
 * Returns undefined when nothing can be told apart; the caller then keeps its generic UI.
 */
export function pickAffectedConnection(
  connections: Connection[],
  status: SetupStatus | undefined,
  message?: string | null,
): Connection | undefined {
  if (connections.length === 0) return undefined;

  const text = (message ?? '').toLowerCase();
  if (text) {
    const named = connections.filter(c => c.name.length > 2 && text.includes(c.name.toLowerCase()));
    if (named.length === 1) return named[0];
  }

  const flagged = status?.backendChecks?.find(b => b.defaultProvider)?.id;
  const byId = flagged ? connections.find(c => c.id === flagged) : undefined;
  const byType = status?.defaultProvider
    ? connections.filter(c => c.providerType === status.defaultProvider)
    : [];
  if (byId) return byId;
  if (byType.length > 0) return byType.find(needsRecovery) ?? byType[0];

  const attention = connections.filter(needsRecovery);
  return attention.length === 1 ? attention[0] : undefined;
}

/**
 * For a missing or vanished default model no connection is at fault: show the card on the
 * first connection that works (any one, when none does).
 */
export function connectionForModelChoice(connections: Connection[]): Connection | undefined {
  return connections.find(c => c.health === 'available') ?? connections[0];
}

/** A raw backend as a connection, so backend cards share the recovery card. */
export function connectionFromBackend(backend: Backend): Connection {
  const failing = !!backend.error || !!backend.errorCode;
  return {
    id: backend.id,
    name: backend.name,
    providerType: backend.type,
    baseUrl: backend.baseUrl,
    configState: 'configured',
    authState: backend.errorCode === 'login_required' ? 'login_required' : 'not_required',
    health: failing ? 'unavailable' : 'unknown',
    errorCode: backend.errorCode,
    error: backend.error || undefined,
    secretSource: 'none',
    secretConfigured: false,
    secretPresent: false,
    modelCount: backend.models?.length ?? 0,
  };
}
