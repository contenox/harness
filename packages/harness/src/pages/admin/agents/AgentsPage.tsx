import { Container, InlineNotice, P, Page, SettingsGroup, Spinner } from '@contenox/ui';
import { Bot, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useExternalAgentPresets, useExternalAgents } from '../../../hooks/useExternalAgents';
import { AgentRow } from './components/AgentRow';
import { NewAgentRow } from './components/NewAgentRow';

const PRESET_ICONS: Record<string, typeof Bot> = { 'claude-code': Sparkles };

export default function AgentsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const presets = useExternalAgentPresets();
  const agents = useExternalAgents();
  const open = searchParams.get('agent');

  const setOpen = (name: string, expanded: boolean) =>
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (expanded) next.set('agent', name);
        else if (next.get('agent') === name) next.delete('agent');
        return next;
      },
      { replace: true },
    );

  const all = agents.data ?? [];
  const presetNames = new Set((presets.data ?? []).map(p => p.agentName));
  const custom = all.filter(a => !presetNames.has(a.name));
  const takenNames = all.map(a => a.name);
  const loading = presets.isLoading || agents.isLoading;
  const error = presets.error ?? agents.error;

  return (
    <Page bodyScroll="auto" className="h-full">
      <Container padding="px-4 py-4 sm:px-6" innerPadding="p-0">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <P variant="muted" className="px-1 text-[13px]">
            {t('external_agents.intro')}
          </P>
          {loading && (
            <div className="flex justify-center py-6" role="status">
              <Spinner />
            </div>
          )}
          {error && (
            <InlineNotice variant="error" role="alert">
              {t('external_agents.load_error', { message: error.message })}
            </InlineNotice>
          )}
          {!loading && !error && (
            <>
              <SettingsGroup title={t('external_agents.group_presets')}>
                {(presets.data ?? []).map(p => {
                  const Icon = PRESET_ICONS[p.id] ?? Bot;
                  return (
                    <AgentRow
                      key={p.id}
                      icon={<Icon />}
                      title={p.title}
                      description={t(`external_agents.presets.${p.id}` as never, {
                        defaultValue: p.package,
                      })}
                      preset={p}
                      agent={all.find(a => a.name === p.agentName)}
                      takenNames={takenNames}
                      expanded={open === p.agentName}
                      onExpandedChange={x => setOpen(p.agentName, x)}
                    />
                  );
                })}
              </SettingsGroup>
              <SettingsGroup title={t('external_agents.group_custom')}>
                {custom.map(a => (
                  <AgentRow
                    key={a.name}
                    icon={<Bot />}
                    title={a.name}
                    description={[a.command, ...a.args].join(' ')}
                    agent={a}
                    takenNames={takenNames}
                    expanded={open === a.name}
                    onExpandedChange={x => setOpen(a.name, x)}
                  />
                ))}
                <NewAgentRow takenNames={takenNames} onCreated={name => setOpen(name, true)} />
              </SettingsGroup>
            </>
          )}
        </div>
      </Container>
    </Page>
  );
}
