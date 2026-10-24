import { Select } from '../../../components/Select';
import type {
  SessionConfigOption,
  SessionConfigOptionValue,
  SessionConfigValue,
  SessionConfigGroup,
} from '@contenox/acp-client';


function isFlat(
  values: SessionConfigValue[] | SessionConfigGroup[],
): values is SessionConfigValue[] {
  return values.length === 0 || !('options' in values[0]);
}


function selectRows(option: SessionConfigOption): SessionConfigValue[] {
  if (isFlat(option.options)) return option.options;
  const rows: SessionConfigValue[] = [];
  for (const group of option.options as SessionConfigGroup[]) {
    for (const row of group.options) rows.push(row);
  }
  return rows;
}


function isBoolean(option: SessionConfigOption): boolean {
  return option.type === 'boolean';
}

export interface SessionConfigBarProps {
  options: SessionConfigOption[];
  onSet: (configId: string, value: SessionConfigOptionValue) => void;
  disabled?: boolean;
}

export function SessionConfigBar({ options, onSet, disabled }: SessionConfigBarProps) {
  if (options.length === 0) return null;
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-1.5 sm:px-4"
      aria-label="Session options">
      {options.map(option => {
        const rows = selectRows(option);
        if (isBoolean(option)) {
          return (
            <label key={option.id} className="flex items-center gap-1.5 text-xs">
              <span className="text-text-muted dark:text-dark-text-muted">{option.name}</span>
              <Select
                aria-label={option.name}
                title={option.description}
                disabled={disabled}
                value={String(option.currentValue)}
                onChange={e => onSet(option.id, e.currentTarget.value === 'true')}
                options={[
                  { value: 'true', label: 'On' },
                  { value: 'false', label: 'Off' },
                ]}
              />
            </label>
          );
        }
        if (rows.length === 0) return null;
        return (
          <label key={option.id} className="flex items-center gap-1.5 text-xs">
            <span className="text-text-muted dark:text-dark-text-muted">{option.name}</span>
            <Select
              aria-label={option.name}
              title={option.description}
              disabled={disabled}
              value={option.currentValue}
              onChange={e => onSet(option.id, e.currentTarget.value)}
              options={rows.map(r => ({ value: r.value, label: r.name }))}
            />
          </label>
        );
      })}
    </div>
  );
}
