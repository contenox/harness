import { Button, FormField, H2, InlineNotice, P, Panel, Select } from '@contenox/ui';
import { FormEvent, useContext, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgents } from '../../../hooks/useAgents';
import { useCLIConfig } from '../../../hooks/useCLIConfig';
import { useEnvelopes } from '../../../hooks/useEnvelopes';
import { usePutCLIConfig } from '../../../hooks/usePutCLIConfig';
import { AuthContext } from '../../../lib/authContext';
import type { CLIConfigUpdateRequest } from '../../../lib/types';

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );

export function MissionSettingsSection() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const { data: cliConfig } = useCLIConfig(!!user);
  const { data: agents, error: agentsError } = useAgents();
  const { data: envelopes, error: envelopesError } = useEnvelopes();
  const putConfig = usePutCLIConfig();
  const formId = useId();

  const [agent, setAgent] = useState('');
  const [policy, setPolicy] = useState('');

  useEffect(() => {
    if (!cliConfig) return;
    setAgent(cliConfig.defaultMissionAgent || '');
    setPolicy(cliConfig.defaultMissionPolicy || '');
  }, [cliConfig]);

  useEffect(() => {
    if (!putConfig.isSuccess) return;
    const timer = window.setTimeout(() => putConfig.reset(), 3000);
    return () => window.clearTimeout(timer);
  }, [putConfig.isSuccess, putConfig.reset]);

  const enabledAgentNames = useMemo(
    () => uniqueSorted((agents ?? []).filter(a => a.enabled).map(a => a.name)),
    [agents],
  );

  const agentOptions = useMemo(() => {
    const values = [...enabledAgentNames];
    const current = agent.trim();
    if (current && !values.includes(current)) values.unshift(current);
    return [
      { value: '', label: t('settings.mission_not_set') },
      ...values.map(value => ({ value, label: value })),
    ];
  }, [agent, enabledAgentNames, t]);

  const policyOptions = useMemo(() => {
    const values = uniqueSorted((envelopes ?? []).map(envelope => envelope.name));
    const current = policy.trim();
    if (current && !values.includes(current)) values.unshift(current);
    return [
      { value: '', label: t('settings.mission_not_set') },
      ...values.map(value => ({ value, label: value })),
    ];
  }, [envelopes, policy, t]);

  const agentUnresolved = useMemo(() => {
    const current = agent.trim();
    if (!current || !agents) return false;
    return !enabledAgentNames.includes(current);
  }, [agent, agents, enabledAgentNames]);

  const policyUnresolved = useMemo(() => {
    const current = policy.trim();
    if (!current || !envelopes) return false;
    return !(envelopes ?? []).map(envelope => envelope.name).includes(current);
  }, [envelopes, policy]);

  const incomplete = !agent.trim() || !policy.trim();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    putConfig.reset();
    const body: CLIConfigUpdateRequest = {
      'default-mission-agent': agent.trim(),
      'default-mission-policy': policy.trim(),
    };
    putConfig.mutate(body);
  };

  return (
    <Panel variant="surface">
      <div className="space-y-4">
        <div className="space-y-1">
          <H2>{t('settings.mission_section_title')}</H2>
          <P variant="muted" className="text-sm">
            {t('settings.mission_section_description')}
          </P>
        </div>

        <form id={formId} onSubmit={onSubmit} className="grid gap-4">
          {incomplete && (
            <InlineNotice variant="warning" className="rounded-lg">
              {t('settings.mission_incomplete_notice')}
            </InlineNotice>
          )}

          <FormField
            label={t('settings.mission_agent_label')}
            tooltip={t('settings.mission_agent_tooltip')}>
            <Select
              name="default-mission-agent"
              className="w-full"
              value={agent}
              onChange={e => setAgent(e.target.value)}
              options={agentOptions}
            />
            {agentUnresolved && (
              <P className="text-warning mt-1 text-xs">
                {t('settings.mission_agent_unresolved', { name: agent.trim() })}
              </P>
            )}
            {enabledAgentNames.length === 0 && !agentsError && (
              <P variant="muted" className="mt-1 text-xs">
                {t('settings.mission_no_agents')}
              </P>
            )}
            {agentsError && (
              <P className="text-error mt-1 text-xs">
                {t('settings.mission_agent_options_error', { message: agentsError.message })}
              </P>
            )}
          </FormField>

          <FormField
            label={t('settings.mission_policy_label')}
            tooltip={t('settings.mission_policy_tooltip')}>
            <Select
              name="default-mission-policy"
              className="w-full"
              value={policy}
              onChange={e => setPolicy(e.target.value)}
              options={policyOptions}
            />
            {policyUnresolved && (
              <P className="text-warning mt-1 text-xs">
                {t('settings.mission_policy_unresolved', { name: policy.trim() })}
              </P>
            )}
            {envelopesError && (
              <P className="text-error mt-1 text-xs">
                {t('settings.policy_options_error', { message: envelopesError.message })}
              </P>
            )}
          </FormField>

          {putConfig.isError && <P className="text-error text-sm">{putConfig.error.message}</P>}
          {putConfig.isSuccess && <P className="text-text-muted text-sm">{t('settings.saved')}</P>}

          <div>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              size="sm"
              disabled={putConfig.isPending}>
              {t('settings.save')}
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  );
}
