
import type { SessionConfigOption, SessionConfigValue } from '@contenox/acp-client';
import { isGroupedOptions, selectableValues } from './configOptions';


export const MODEL_CONFIG_ID = 'model';

export const THINK_CONFIG_ID = 'think';

export const HITL_POLICY_CONFIG_ID = 'hitl-policy';

export const COMMAND_MODEL = 'model';
export const COMMAND_PROVIDER = 'provider';
export const COMMAND_THINK = 'think';
export const COMMAND_POLICY = 'policy';


const MODEL_DEFAULT_GROUP = 'default';


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

function modelCommandDomains(option: SessionConfigOption): {
  models: string[];
  providers: string[];
} {
  const models: string[] = [];
  const providers: string[] = [];
  if (!Array.isArray(option.options)) return { models, providers };

  if (isGroupedOptions(option.options)) {
    for (const group of option.options) {
      const provider = text(group.group);
      if (provider !== '' && provider !== MODEL_DEFAULT_GROUP) providers.push(provider);
      for (const value of group.options ?? []) {
        models.push(modelFromConfigValue(value.value, provider));
      }
    }
    return { models, providers };
  }



  for (const value of option.options as SessionConfigValue[]) {
    const [provider, model] = splitModelConfigValue(value.value);
    if (provider !== '') providers.push(provider);
    models.push(model);
  }
  return { models, providers };
}


function modelFromConfigValue(value: unknown, provider: string): string {
  const model = text(value);
  if (provider === '' || provider === MODEL_DEFAULT_GROUP) return model;
  return model.startsWith(`${provider}/`) ? model.slice(provider.length + 1) : model;
}

function splitModelConfigValue(value: unknown): [provider: string, model: string] {
  const raw = text(value);
  const slash = raw.indexOf('/');
  if (slash < 0) return ['', raw];
  return [raw.slice(0, slash).trim(), raw.slice(slash + 1).trim()];
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
