import type { SessionConfigOption } from '@contenox/acp-client';

export const WORKSPACE_ROOT_CONFIG_ID = 'workspace-root';

export interface ComposerChipOptions {
  /** Approval policy / agent mode. */
  mode?: SessionConfigOption;
  model?: SessionConfigOption;
  /** Everything else, shown in the overflow chip. */
  rest: SessionConfigOption[];
}

function isMode(o: SessionConfigOption): boolean {
  return o.id === 'hitl-policy' || o.id === 'mode' || o.category === '_hitl_policy' || o.category === 'mode';
}

function isModel(o: SessionConfigOption): boolean {
  return o.id === 'model' || o.category === 'model';
}

/**
 * Overlays the live model catalog on a session's options, keeping the session's current value.
 * A session opened before a provider recovered otherwise keeps the catalog it was created with.
 */
export function withLiveModelValues(
  sessionOptions: readonly SessionConfigOption[],
  liveOptions: readonly SessionConfigOption[] | undefined,
): readonly SessionConfigOption[] {
  const liveModel = liveOptions?.find(isModel);
  if (!liveModel || !sessionOptions.some(isModel)) return sessionOptions;
  return sessionOptions.map(option => (isModel(option) ? { ...option, options: liveModel.options } : option));
}

/** Sorts ACP config options into the composer's chips. The workspace root is handled by the project chip. */
export function splitComposerOptions(options: readonly SessionConfigOption[]): ComposerChipOptions {
  let mode: SessionConfigOption | undefined;
  let model: SessionConfigOption | undefined;
  const rest: SessionConfigOption[] = [];
  for (const o of options) {
    if (o.id === WORKSPACE_ROOT_CONFIG_ID) continue;
    if (!mode && isMode(o)) mode = o;
    else if (!model && isModel(o)) model = o;
    else rest.push(o);
  }
  return { mode, model, rest };
}
