import type { SessionConfigOption, SessionConfigOptionValue } from '@contenox/acp-client';
import { flattenGroups, fromControlValue, toControlProps } from '../lib/configOptions';
import { CheckboxField, SelectField } from '../../../components/forms/Fields';

/**
 * One control for one `SessionConfigOption`, whichever option it is.
 */
export interface ConfigOptionControlProps {
  option: SessionConfigOption;
  /**
   * Overrides the option's own `currentValue`.
   */
  value?: SessionConfigOptionValue;
  onChange: (value: SessionConfigOptionValue) => void;
  disabled?: boolean;
  /**
   * Standing guidance under the control.
   */
  hint?: string;
}

export function ConfigOptionControl({
  option,
  value,
  onChange,
  disabled,
  hint,
}: ConfigOptionControlProps) {
  const props = toControlProps(option);

  if (props.kind === 'boolean') {
    const checked = typeof value === 'boolean' ? value : (props.checked ?? false);
    return (
      <CheckboxField
        label={option.name}
        checked={checked}
        disabled={disabled}
        onChange={next => onChange(fromControlValue('boolean', next))}
      />
    );
  }

  const options =
    props.kind === 'select-grouped' ? flattenGroups(props.groups ?? []) : (props.options ?? []);
  const current = typeof value === 'string' ? value : (props.value ?? '');

  return (
    <SelectField
      label={option.name}
      hint={hint}
      value={current}
      disabled={disabled}
      options={options}
      onChange={event => onChange(fromControlValue(props.kind, event.target.value))}
    />
  );
}
