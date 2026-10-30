
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
 * Generic: the model command offers every selectable value (opaque, inserted as-is); the provider
 * command offers the option's group ids when it is grouped.
 */
function modelCommandDomains(option: SessionConfigOption): {
  models: string[];
  providers: string[];
} {
  const models = selectableValues(option).map(value => value.value);
  const providers = isGroupedOptions(option.options)
    ? option.options.map(group => text(group.group)).filter(id => id !== '')
    : [];
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
