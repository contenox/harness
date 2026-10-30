import type { SetupStatus } from './types';

export const PREFERRED_DEFAULT_MODEL = 'gpt-5.4';

export type DefaultSelection = { provider: string; model: string };

/** Picks the preferred model from a list: gpt-5.4 when present, else the first entry. */
export function pickDefaultModel(models: readonly string[]): string | null {
  if (models.length === 0) return null;
  return models.find(m => m === PREFERRED_DEFAULT_MODEL) ?? models[0];
}

/** Unique chat models of the backends of the given type (all backends when no type). */
export function chatModelsFor(status: SetupStatus | undefined, provider?: string): string[] {
  const checks = (status?.backendChecks ?? []).filter(b => !provider || b.type === provider);
  return Array.from(new Set(checks.flatMap(b => b.chatModels ?? [])));
}

/**
 * Chooses the default provider + model once chat models are visible.
 * Prefers the hinted provider (the one the user just set up); otherwise the first backend
 * that exposes chat models. Returns null while no model is available yet.
 */
export function planDefaultSelection(
  status: SetupStatus | undefined,
  preferredProvider?: string,
): DefaultSelection | null {
  const checks = status?.backendChecks ?? [];
  const candidates = [
    ...(preferredProvider ? checks.filter(b => b.type === preferredProvider) : []),
    ...checks.filter(b => !preferredProvider || b.type !== preferredProvider),
  ];
  for (const backend of candidates) {
    const model = pickDefaultModel(backend.chatModels ?? []);
    if (model) return { provider: backend.type, model };
  }
  return null;
}

const DEFAULT_ISSUE_CODES = new Set(['missing_default_model', 'missing_default_provider']);

/** True when the only blocking problems are the unset default model/provider. */
export function onlyDefaultsMissing(status: SetupStatus | undefined): boolean {
  // Without a reachable backend there is nothing to pick a default from.
  if (!status || status.reachableBackendCount === 0) return false;
  const errors = (status.issues ?? []).filter(i => i.severity === 'error');
  return errors.length > 0 && errors.every(i => DEFAULT_ISSUE_CODES.has(i.code));
}
