
import type { SessionConfigOption } from '@contenox/acp-client';
import { isGroupedOptions, selectableValues } from './configOptions';


export const MODEL_CONFIG_ID = 'model';

export const THINK_CONFIG_ID = 'think';

export const HITL_POLICY_CONFIG_ID = 'hitl-policy';

export const COMMAND_MODEL = 'model';
export const COMMAND_PROVIDER = 'provider';
export const COMMAND_THINK = 'think';
export const COMMAND_POLICY = 'policy';


const HITL_POLICY_DEFAULT_VALUE = '__contenox_default__';

const ANY_PROVIDER_GROUP = 'any';

export type CommandValueDomains = ReadonlyMap<string, readonly string[]>;


export const NO_VALUE_DOMAINS: CommandValueDomains = new Map<string, readonly string[]>();

export function commandValueDomains(
  options: readonly SessionConfigOption[] | undefined,
): CommandValueDomains {
  const domains = new Map<string, string[]>();
  for (const option of options ?? []) {
    switch (option.id) {
      case MODEL_CONFIG_ID: {
        const { models, providers } = modelCommandDomains(option);
        addCommandValues(domains, COMMAND_MODEL, models);
        addCommandValues(domains, COMMAND_PROVIDER, providers);
        break;
      }
      case THINK_CONFIG_ID:
        addCommandValues(
          domains,
          COMMAND_THINK,
          selectableValues(option).map(value => value.value),
        );
        break;
      case HITL_POLICY_CONFIG_ID:
        addCommandValues(
          domains,
          COMMAND_POLICY,
          selectableValues(option)
            .filter(value => value.value !== HITL_POLICY_DEFAULT_VALUE)
            .map(value => value.value),
        );
        break;
    }
  }
  return domains;
}

/**
 * Grouped model options carry connection-qualified wire values; a slash command takes the
 * readable provider/model form, and a group's display name is what matches a backend type or
 * name. The any-provider group keeps its id because "any" is the selector, not its label.
 */
function modelCommandDomains(option: SessionConfigOption): {
  models: string[];
  providers: string[];
} {
  if (!isGroupedOptions(option.options)) {
    const models = selectableValues(option)
      .map(value => text(value.value))
      .filter(value => value !== '');
    return { models, providers: [] };
  }
  const models: string[] = [];
  const providers: string[] = [];
  for (const group of option.options) {
    const id = text(group.group);
    const selector = id === ANY_PROVIDER_GROUP ? id : text(group.name) || id;
    if (selector !== '') providers.push(selector);
    for (const value of group.options ?? []) {
      const model = text(value.name) || text(value.value);
      if (model === '') continue;
      models.push(selector === '' ? model : `${selector}/${model}`);
    }
  }
  return { models, providers };
}

function addCommandValues(
  domains: Map<string, string[]>,
  command: string,
  values: readonly unknown[],
): void {
  for (const candidate of values) {
    const value = text(candidate);
    if (value === '') continue;
    const existing = domains.get(command);
    if (existing === undefined) {
      domains.set(command, [value]);
      continue;
    }
    if (existing.includes(value)) continue;
    existing.push(value);
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
