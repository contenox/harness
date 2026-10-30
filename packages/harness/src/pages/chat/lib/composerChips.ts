import type { SessionConfigOption } from '@contenox/acp-client';
import { flattenGroups, toControlProps, type SelectControlOption } from '@contenox/ui/session-lib';

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

/** Flat choices of a select option (grouped options are flattened with "group / name" labels). */
export function optionChoices(option: SessionConfigOption): SelectControlOption[] {
  const props = toControlProps(option);
  if (props.kind === 'boolean') return [];
  return props.kind === 'select-grouped' ? flattenGroups(props.groups ?? []) : (props.options ?? []);
}

/** Label of the option's current value, falling back to the raw value. */
export function currentChoiceLabel(option: SessionConfigOption): string {
  const choice = optionChoices(option).find(c => c.value === option.currentValue);
  return choice?.label ?? option.currentValue;
}

/** Last segment of a "group / name" label (the model name without its provider). */
export function shortChoiceLabel(label: string): string {
  const i = label.lastIndexOf(' / ');
  return i >= 0 ? label.slice(i + 3) : label;
}

/** Whether the option is the model selector (its chip shows only the model name). */
export function isModelOption(option: SessionConfigOption): boolean {
  return isModel(option);
}
