import type {
  SessionConfigGroup,
  SessionConfigOption,
  SessionConfigOptionValue,
  SessionConfigOptionValues,
  SessionConfigValue,
} from '@contenox/acp-client';

/**
 * The wire shape of a `SessionConfigOption`, mapped to what a control needs to render it — and back again.
 */

export type ConfigControlKind = 'boolean' | 'select-flat' | 'select-grouped';

export interface SelectControlOption {
  value: string;
  label: string;
}

export interface SelectControlGroup {
  group: string;
  label: string;
  options: SelectControlOption[];
}

export interface ConfigControlProps {
  kind: ConfigControlKind;
  /**
   * boolean controls only.
   */
  checked?: boolean;
  /**
   * select controls only — the wire `currentValue`.
   */
  value?: string;
  /**
   * select-flat only.
   */
  options?: SelectControlOption[];
  /**
   * select-grouped only.
   */
  groups?: SelectControlGroup[];
}

/**
 * Whether an option's values arrived grouped (`SessionConfigGroup[]`) rather than flat.
 */
export function isGroupedOptions(
  options: SessionConfigOptionValues | undefined,
): options is SessionConfigGroup[] {
  return Array.isArray(options) && options.length > 0 && 'group' in options[0];
}

/**
 * Flattens grouped values into one option list, prefixing the group name onto each label.
 */
export function flattenGroups(groups: SelectControlGroup[]): SelectControlOption[] {
  return groups.flatMap(group =>
    group.options.map(option => ({ value: option.value, label: `${group.label} / ${option.label}` })),
  );
}

/**
 * Maps one option to the props its control needs.
 */
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

/**
 * Maps a control's raw output back to the wire value `set_config_option` expects for that kind.
 */
export function fromControlValue(
  kind: ConfigControlKind,
  raw: string | boolean,
): SessionConfigOptionValue {
  return kind === 'boolean' ? (typeof raw === 'boolean' ? raw : raw === 'true') : String(raw);
}

/**
 * One option out of an advertised list, by id, or undefined when the agent did not advertise it.
 */
export function findConfigOption(
  options: readonly SessionConfigOption[] | undefined,
  id: string,
): SessionConfigOption | undefined {
  return options?.find(option => option.id === id);
}

/**
 * Every value an option offers, flattened, whatever shape it arrived in — the list a caller iterates when it cares about the values themselves rather than about rendering a control (the workspace-root allowlist is the case in hand).
 */
export function selectableValues(option: SessionConfigOption): SessionConfigValue[] {
  const props = toControlProps(option);
  if (props.kind === 'boolean') return [];
  if (!Array.isArray(option.options)) return [];
  return isGroupedOptions(option.options)
    ? option.options.flatMap(group => group.options ?? [])
    : (option.options as SessionConfigValue[]);
}
