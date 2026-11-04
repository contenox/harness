import { Button, FormField, InlineNotice, Input, P, Span, Spinner, Step, Steps } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useExternalAgentLogin } from '../../../../hooks/useExternalAgents';
import type { ExternalAgentAuthMethod } from '../../../../lib/types';
import { AgentProblem } from './AgentProblem';

type Props = {
  name: string;
  title: string;
  methods: ExternalAgentAuthMethod[];
};

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return url;
  }
}

export function AgentSignIn({ name, title, methods }: Props) {
  const { t } = useTranslation();
  const { login, start, submit, cancel } = useExternalAgentLogin(name);
  const [code, setCode] = useState('');
  const runnable = methods
    .filter(m => m.type === 'terminal')
    .sort((a, b) => Number(!!a.unofficial) - Number(!!b.unofficial));
  const unofficial = runnable.filter(m => m.unofficial);
  const active = login && (login.state === 'running' || login.state === 'waiting_for_code');

  if (login?.state === 'succeeded') {
    return (
      <InlineNotice variant="success" role="status">
        {t('external_agents.signin.done', { name: title })}
      </InlineNotice>
    );
  }

  if (active && login.url) {
    return (
      <div className="flex flex-col gap-4">
        <Steps>
          <Step number={1} title={t('external_agents.signin.step_open')}>
            {t('external_agents.signin.step_open_desc')}{' '}
            <Button
              type="button"
              variant="text"
              size="xs"
              className="inline-flex h-auto px-0 align-baseline"
              onClick={() => window.open(login.url, '_blank', 'noopener,noreferrer')}>
              {displayUrl(login.url)}
            </Button>
          </Step>
          <Step number={2} title={t('external_agents.signin.step_code')}>
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={e => {
                e.preventDefault();
                if (code.trim()) submit.mutate(code.trim(), { onSuccess: () => setCode('') });
              }}>
              <FormField label={t('external_agents.signin.code_label')} className="flex-1">
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder={t('external_agents.signin.code_placeholder')}
                  autoComplete="off"
                  spellCheck={false}
                  mono
                  disabled={submit.isPending}
                />
              </FormField>
              <Button type="submit" size="sm" isLoading={submit.isPending} disabled={!code.trim()}>
                {t('external_agents.signin.finish')}
              </Button>
            </form>
          </Step>
        </Steps>
        {submit.error && (
          <InlineNotice variant="error" role="alert">
            {submit.error.message}
          </InlineNotice>
        )}
        <div className="flex items-center justify-between gap-3">
          <Span variant="muted" className="flex items-center gap-2 text-sm" role="status">
            <Spinner size="xs" />
            {t('external_agents.signin.waiting')}
          </Span>
          <Button type="button" variant="ghost" size="sm" isLoading={cancel.isPending} onClick={() => cancel.mutate()}>
            {t('external_agents.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {login?.state === 'failed' && login.problem && <AgentProblem problem={login.problem} />}
      {start.error && (
        <InlineNotice variant="error" role="alert">
          {start.error.message}
        </InlineNotice>
      )}
      {runnable.length === 0 ? (
        <P variant="muted" className="text-sm">
          {t('external_agents.signin.no_methods', { name: title })}
        </P>
      ) : (
        <div className="flex flex-wrap gap-2">
          {runnable.map((m, i) => (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={i === 0 ? 'primary' : 'secondary'}
              isLoading={(start.isPending && start.variables === m.id) || (!!active && login?.methodId === m.id)}
              disabled={start.isPending || !!active}
              onClick={() => start.mutate(m.id)}>
              {t('external_agents.signin.with', { method: m.name })}
            </Button>
          ))}
        </div>
      )}
      {unofficial.map(m => (
        <InlineNotice key={m.id} variant="warning">
          {t('external_agents.signin.unofficial_note', { method: m.name })}
        </InlineNotice>
      ))}
    </div>
  );
}
