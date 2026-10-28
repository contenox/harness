import {
  Badge,
  Button,
  ButtonGroup,
  Container,
  EmptyState,
  ErrorState,
  GridLayout,
  InlineNotice,
  LoadingState,
  P,
  Page,
  Panel,
  Section,
  Span,
} from '@contenox/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, Power, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import type { AgentRecord } from '../../../lib/types';

const presetKeys = ['agent-presets'];
const agentKeys = ['agents'];

export default function AgentsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const presets = useQuery({ queryKey: presetKeys, queryFn: api.listAgentPresets });
  const agents = useQuery({ queryKey: agentKeys, queryFn: api.listAgents });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: presetKeys });
    void queryClient.invalidateQueries({ queryKey: agentKeys });
  };

  const install = useMutation({
    mutationFn: (name: string) => api.installAgentPreset(name),
    onSuccess: refresh,
  });
  const toggle = useMutation({
    mutationFn: (agent: AgentRecord) => api.updateAgent({ ...agent, enabled: !agent.enabled }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (agent: AgentRecord) => api.deleteAgent(agent.id),
    onSuccess: refresh,
  });

  const error = install.error?.message ?? toggle.error?.message ?? remove.error?.message ?? null;

  return (
    <Page bodyScroll="auto">
      <Container title={t('agents.title')}>
        <P variant="muted">{t('agents.description')}</P>

        {error && (
          <InlineNotice variant="error" role="alert">
            {error}
          </InlineNotice>
        )}

        <Section title={t('agents.presets_title')} description={t('agents.presets_description')}>
          {presets.isLoading ? (
            <LoadingState message={t('common.loading')} />
          ) : presets.error ? (
            <ErrorState
              error={presets.error}
              onRetry={() => void presets.refetch()}
              title={t('agents.load_error')}
            />
          ) : presets.data?.length ? (
            <GridLayout variant="body">
              {presets.data.map(preset => (
                <Panel key={preset.name} variant="body" className="space-y-2">
                  <Span className="text-sm font-semibold">{preset.title}</Span>
                  <P variant="muted" className="text-sm">
                    {preset.description}
                  </P>
                  <ButtonGroup className="items-center">
                    <Badge variant={preset.installed ? 'success' : 'secondary'} size="sm">
                      {preset.installed ? t('agents.installed') : t('agents.not_installed')}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant={preset.installed ? 'outline' : 'primary'}
                      disabled={preset.installed || install.isPending}
                      onClick={() => install.mutate(preset.name)}>
                      <Plus className="h-4 w-4" aria-hidden />
                      {t('agents.install')}
                    </Button>
                  </ButtonGroup>
                </Panel>
              ))}
            </GridLayout>
          ) : (
            <EmptyState title={t('agents.empty_presets')} />
          )}
        </Section>

        <Section title={t('agents.installed_title')} description={t('agents.installed_description')}>
          {agents.isLoading ? (
            <LoadingState message={t('common.loading')} />
          ) : agents.error ? (
            <ErrorState
              error={agents.error}
              onRetry={() => void agents.refetch()}
              title={t('agents.load_error')}
            />
          ) : agents.data?.length ? (
            <GridLayout variant="body">
              {agents.data.map(agent => (
                <Panel key={agent.id} variant="body" className="space-y-2">
                  <ButtonGroup className="items-center">
                    <Bot className="h-4 w-4" aria-hidden />
                    <Span className="text-sm font-semibold">{agent.name}</Span>
                    <Badge variant="outline" size="sm">
                      {agent.kind}
                    </Badge>
                    <Badge variant={agent.enabled ? 'success' : 'secondary'} size="sm">
                      {agent.enabled ? t('agents.enabled') : t('agents.disabled')}
                    </Badge>
                  </ButtonGroup>
                  <ButtonGroup>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      palette="neutral"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate(agent)}>
                      <Power className="h-4 w-4" aria-hidden />
                      {agent.enabled ? t('agents.disable') : t('agents.enable')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      palette="neutral"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(agent)}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t('agents.remove')}
                    </Button>
                  </ButtonGroup>
                </Panel>
              ))}
            </GridLayout>
          ) : (
            <EmptyState title={t('agents.empty')} description={t('agents.empty_description')} />
          )}
        </Section>
      </Container>
    </Page>
  );
}
