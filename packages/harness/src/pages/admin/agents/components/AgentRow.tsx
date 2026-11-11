import { SettingsRow, StatusDot } from '@contenox/ui';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useExternalAgentCheck,
  useSetExternalAgentEnabled,
} from '../../../../hooks/useExternalAgents';
import { agentRowStatus } from '../../../../lib/externalAgentStatus';
import type { ExternalAgent, ExternalAgentPresetStatus } from '../../../../lib/types';
import { AgentDetails } from './AgentDetails';
import { AgentForm } from './AgentForm';
import { AgentMenu } from './AgentMenu';
import { AgentRemoveConfirm } from './AgentRemoveConfirm';
import { PresetInstall } from './PresetInstall';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  agent?: ExternalAgent;
  preset?: ExternalAgentPresetStatus;
  takenNames: string[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function AgentRow({
  icon,
  title,
  description,
  agent,
  preset,
  takenNames,
  expanded,
  onExpandedChange,
}: Props) {
  const { t } = useTranslation();
  const installed = !preset || (preset.installed && !!agent);
  const check = useExternalAgentCheck(agent?.name ?? '', !!agent?.enabled && installed);
  const toggle = useSetExternalAgentEnabled(agent?.name ?? '');
  const status = agentRowStatus({ preset, agent, check: check.data, checking: check.isFetching });
  const [mode, setMode] = useState<'edit' | 'remove' | null>(null);
  const showInstall =
    !!preset &&
    (!installed ||
      preset.installState === 'failed' ||
      preset.installState === 'installing' ||
      preset.updateReady);

  return (
    <SettingsRow
      icon={icon}
      title={title}
      description={description}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      trailing={
        <>
          {status.dot && <StatusDot status={status.dot} aria-label={t(status.summaryKey)} />}
          {agent && (
            <AgentMenu
              name={title}
              enabled={agent.enabled}
              onToggle={() => toggle.mutate(!agent.enabled)}
              onEdit={
                preset
                  ? undefined
                  : () => {
                      setMode('edit');
                      onExpandedChange(true);
                    }
              }
              onRemove={() => {
                setMode('remove');
                onExpandedChange(true);
              }}
            />
          )}
        </>
      }>
      <div className="flex flex-col gap-4">
        {mode === 'remove' && agent && (
          <AgentRemoveConfirm
            name={agent.name}
            title={title}
            preset={!!preset}
            onDone={() => setMode(null)}
          />
        )}
        {mode === 'edit' && agent ? (
          <AgentForm
            agent={agent}
            takenNames={takenNames}
            onSaved={() => setMode(null)}
            onCancel={() => setMode(null)}
          />
        ) : (
          <>
            {showInstall && preset && <PresetInstall preset={preset} />}
            {agent && installed && (
              <AgentDetails agent={agent} title={title} status={status} check={check} />
            )}
          </>
        )}
      </div>
    </SettingsRow>
  );
}
