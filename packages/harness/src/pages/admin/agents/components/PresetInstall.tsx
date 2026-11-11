import { Button, ExternalLink, InlineNotice, P, Span, Spinner } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useInstallPreset } from '../../../../hooks/useExternalAgents';
import type { ExternalAgentPresetStatus } from '../../../../lib/types';
import { AgentProblem } from './AgentProblem';

const NODE_DOWNLOAD = 'https://nodejs.org/en/download';

type Props = {
  preset: ExternalAgentPresetStatus;
};

export function PresetInstall({ preset }: Props) {
  const { t } = useTranslation();
  const install = useInstallPreset();
  const installing = preset.installState === 'installing' || install.isPending;
  const nodeUsable = preset.node.found && (preset.node.major ?? 0) >= preset.minNode;
  const update = preset.updateReady && preset.installed;

  return (
    <div className="flex flex-col gap-3">
      <P variant="muted" className="text-sm">
        {t(update ? 'external_agents.install.update_explain' : 'external_agents.install.explain', {
          name: preset.title,
          package: preset.package,
          version: preset.version,
        })}
      </P>

      {!nodeUsable && !installing && (
        <InlineNotice variant="warning" className="flex flex-col gap-2">
          <span>
            {preset.node.found
              ? t('external_agents.install.node_too_old', {
                  min: preset.minNode,
                  found: preset.node.version,
                })
              : t('external_agents.install.node_missing', { min: preset.minNode })}
          </span>
          <ExternalLink href={NODE_DOWNLOAD}>{t('external_agents.install.get_node')}</ExternalLink>
        </InlineNotice>
      )}

      {preset.installState === 'failed' && preset.installProblem && !installing && (
        <AgentProblem problem={preset.installProblem} />
      )}
      {install.error && (
        <InlineNotice variant="error" role="alert">
          {install.error.message}
        </InlineNotice>
      )}

      <div className="flex items-center justify-end gap-3">
        {installing && (
          <Span variant="muted" className="mr-auto flex items-center gap-2 text-sm" role="status">
            <Spinner size="xs" />
            {t('external_agents.install.running', { name: preset.title })}
          </Span>
        )}
        <Button
          type="button"
          size="sm"
          isLoading={installing}
          disabled={!nodeUsable}
          onClick={() => install.mutate(preset.id)}>
          {preset.installState === 'failed'
            ? t('external_agents.install.retry')
            : update
              ? t('external_agents.install.update', { version: preset.version })
              : t('external_agents.install.action', { name: preset.title })}
        </Button>
      </div>
    </div>
  );
}
