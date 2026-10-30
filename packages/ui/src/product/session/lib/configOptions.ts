import type {
  SessionConfigGroup,
  SessionConfigOption,
  SessionConfigOptionValue,
  SessionConfigOptionValues,
  SessionConfigValue,
} from '@contenox/acp-client';


export type ConfigControlKind = 'boolean' | 'select-flat' | 'select-grouped';

export interface SelectControlOption {
  value: string;
  label: string;
  /** Group name for native <optgroup> rendering. */
  group?: string;
}

export interface SelectControlGroup {
  group: string;
  label: string;
  options: SelectControlOption[];
}

export interface ConfigControlProps {
  kind: ConfigControlKind;
  checked?: boolean;
  value?: string;
  options?: SelectControlOption[];
  groups?: SelectControlGroup[];
}

export function isGroupedOptions(
  options: SessionConfigOptionValues | undefined,
): options is SessionConfigGroup[] {
  return Array.isArray(options) && options.length > 0 && 'group' in options[0];
}

/** Flat list of a grouped select; each entry keeps its group name (labels are not concatenated). */
export function flattenGroups(groups: SelectControlGroup[]): SelectControlOption[] {
  return groups.flatMap(group =>
    group.options.map(option => ({ value: option.value, label: option.label, group: group.label })),
  );
}

export function toControlProps(option: SessionConfigOption): ConfigControlProps {
  if (option.type === 'boolean') {
    return { kind: 'boolean', checked: option.currentValue === 'true' };
  }
  if (isGroupedOptions(option.options)) {
    return {
      kind: 'select-grouped',
      value: option.currentValue,
      groups: option.options.map((group: SessionConfigGroup) => ({
        group: group.group,
        label: group.name,
        options: (group.options ?? []).map((value: SessionConfigValue) => ({
          value: value.value,
          label: value.name,
        })),
      })),
    };
  }
  return {
    kind: 'select-flat',
    value: option.currentValue,
    options: (Array.isArray(option.options) ? (option.options as SessionConfigValue[]) : []).map(
      value => ({ value: value.value, label: value.name }),
    ),
  };
}

export function fromControlValue(
  kind: ConfigControlKind,
  raw: string | boolean,
): SessionConfigOptionValue {
  return kind === 'boolean' ? (typeof raw === 'boolean' ? raw : raw === 'true') : String(raw);
}

export function findConfigOption(
  options: readonly SessionConfigOption[] | undefined,
  id: string,
): SessionConfigOption | undefined {
  return options?.find(option => option.id === id);
}

export function selectableValues(option: SessionConfigOption): SessionConfigValue[] {
  const props = toControlProps(option);
  if (props.kind === 'boolean') return [];
  if (!Array.isArray(option.options)) return [];
  return isGroupedOptions(option.options)
    ? option.options.flatMap(group => group.options ?? [])
    : (option.options as SessionConfigValue[]);
}
