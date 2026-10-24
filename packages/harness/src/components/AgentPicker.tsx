import { Dropdown } from '@contenox/ui';
import type { MouseEventHandler, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgents } from '../hooks/useAgents';

export const AGENT_PICKER_CONTENT_CLASSNAME =
  'right-0 left-auto w-[min(14rem,calc(100vw-1.5rem))] max-h-[min(16rem,60vh)] overflow-auto';

export interface AgentPickerProps {
  value: string | null;
  onSelect: (name: string | null) => void;
  trigger: ReactElement<{ onClick?: MouseEventHandler }>;
  hideWhenEmpty?: boolean;
}

export function AgentPicker({ value, onSelect, trigger, hideWhenEmpty = true }: AgentPickerProps) {
  const { t } = useTranslation();
  const { data } = useAgents();

  const agents = (data ?? []).filter(a => a.enabled && a.name.toLowerCase() !== 'contenox');

  if (hideWhenEmpty && agents.length === 0 && value == null) return null;

  const options = [
    { value: '', label: t('acp_chat.agent_native') },
    ...agents.map(a => ({ value: a.name, label: a.name })),
  ];

  return (
    <Dropdown
      trigger={trigger}
      options={options}
      value={value ?? ''}
      onChange={v => onSelect(v === '' ? null : v)}
      contentClassName={AGENT_PICKER_CONTENT_CLASSNAME}
    />
  );
}
