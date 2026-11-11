import { Button, InlineNotice, P, Span, Spinner, StatusDot } from '@contenox/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { MessageSquarePlus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AgentRowStatus } from '../../../../lib/externalAgentStatus';
import type { ExternalAgent, ExternalAgentCheck } from '../../../../lib/types';
import { useStartAgentChat } from '../useStartAgentChat';
import { AgentAccess } from './AgentAccess';
import { AgentProblem } from './AgentProblem';
import { AgentSignIn } from './AgentSignIn';

type Props = {
  agent: ExternalAgent;
  title: string;
  status: AgentRowStatus;
  check: UseQueryResult<ExternalAgentCheck, Error>;
};

export function AgentDetails({ agent, title, status, check }: Props) {
  const { t } = useTranslation();
  const startChat = useStartAgentChat();
  const result = check.data;
  const recheck = () => void check.refetch();

  return (
    <div className="flex flex-col gap-4">
      {status.state === 'off' && (
        <P variant="muted" className="text-sm">
          {t('external_agents.off_hint', { name: title })}
        </P>
      )}

      {status.state === 'checking' && (
        <Span variant="muted" className="flex items-center gap-2 text-sm" role="status">
          <Spinner size="xs" />
          {t('external_agents.checking', { name: title })}
        </Span>
      )}

      {check.error && (
        <InlineNotice variant="error" role="alert">
          {check.error.message}
        </InlineNotice>
      )}

      {status.state === 'problem' && result?.problem && (
        <AgentProblem
          problem={result.problem}
          action={
            <Button type="button" variant="secondary" size="sm" onClick={recheck}>
              {t('external_agents.check_again')}
            </Button>
          }
        />
      )}

      {status.state === 'sign_in' && result && (
        <div className="flex flex-col gap-3">
          <InlineNotice variant="warning">
            {t('external_agents.sign_in_needed', { name: title })}
          </InlineNotice>
          <AgentSignIn name={agent.name} title={title} methods={result.authMethods} />
        </div>
      )}

      {status.state === 'ready' && result && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusDot
            status="available"
            label={
              result.authLabel
                ? t('external_agents.ready_as', { label: result.authLabel })
                : t('external_agents.status.ready')
            }
          />
          {result.agent?.version && (
            <Span variant="muted" className="text-xs">
              {t('external_agents.version', { version: result.agent.version })}
            </Span>
          )}
        </div>
      )}

      <AgentAccess agent={agent} />

      {agent.enabled && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={check.isFetching}
            onClick={recheck}>
            <RefreshCw
              className={check.isFetching ? 'size-3.5 animate-spin' : 'size-3.5'}
              aria-hidden
            />
            {t('external_agents.check_again')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={status.state !== 'ready' && status.state !== 'unchecked'}
            onClick={() => startChat(agent.name)}>
            <MessageSquarePlus className="size-3.5" aria-hidden />
            {t('external_agents.start_chat')}
          </Button>
        </div>
      )}
    </div>
  );
}
