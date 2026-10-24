import { Input, Select } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceRoot } from '../../lib/types';
import { shortenRootPath } from '../../lib/workspaceRoots';

function rootOptionLabel(root: WorkspaceRoot): string {
  const name = root.name?.trim();
  const path = shortenRootPath(root.path);
  return name ? `${name} (${path})` : path;
}

export const CUSTOM_ROOT_VALUE = '__custom_root__';

export interface RootSelectorProps {
  value: string;
  onChange: (cwd: string) => void;
  roots: readonly WorkspaceRoot[];
  isAbsent: boolean;
}

export function RootSelector({ value, onChange, roots, isAbsent }: RootSelectorProps) {
  const { t } = useTranslation();
  const isKnownRoot = roots.some(r => r.path === value);
  const [customMode, setCustomMode] = useState(!isKnownRoot && value.trim() !== '');

  if (isAbsent) {
    return (
      <Input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('roots.free_path_placeholder')}
      />
    );
  }

  const options = [
    ...roots.map(r => ({
      value: r.path,
      label: r.default
        ? `${rootOptionLabel(r)} — ${t('roots.default_marker')}`
        : rootOptionLabel(r),
    })),
    { value: CUSTOM_ROOT_VALUE, label: t('roots.selector_custom') },
  ];

  const selectValue = customMode ? CUSTOM_ROOT_VALUE : value;

  const handleSelect = (next: string) => {
    if (next === CUSTOM_ROOT_VALUE) {
      setCustomMode(true);
      onChange('');
      return;
    }
    setCustomMode(false);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <Select
        className="w-full"
        value={selectValue}
        onChange={e => handleSelect(e.target.value)}
        options={options}
        placeholder={t('roots.selector_placeholder')}
      />
      {customMode && (
        <Input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={t('roots.free_path_placeholder')}
          aria-label={t('roots.free_path_label')}
        />
      )}
    </div>
  );
}
