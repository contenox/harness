import { Button, InlineNotice, Input, Select, Textarea } from '@contenox/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAcpWorkspace } from '../../../hooks/useAcpWorkspace';
import { useAgents } from '../../../hooks/useAgents';
import { useEnvelopes } from '../../../hooks/useEnvelopes';
import { missionAgentNames } from '../../../lib/missionAgents';
import { cwdApiFetch } from '../../../lib/projectRuntime';
import type { WorkspaceEvent } from '../../../lib/workspaceEvents';

export interface Subscription {
  id: string;
  name: string;
  enabled: boolean;
  agentName: string;
  hitlPolicyName: string;
  prompt: string;
  topicGlob?: string;
  pathGlob?: string;
  events: string[];
  target?: string;
  createdBy?: string;
  sessionId?: string;
  onDone?: string;
}
export function TriggerForm({
  root,
  event,
  initialTarget = 'mission',
  sessions = {},
  onDone,
}: {
  root: string;
  event?: WorkspaceEvent;
  initialTarget?: string;
  sessions?: Record<string, string>;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [filter, setFilter] = useState(event?.subject ?? '');
  const [agent, setAgent] = useState('');
  const [policy, setPolicy] = useState('');
  const [prompt, setPrompt] = useState('');
  const agents = useAgents();
  const policies = useEnvelopes(root);
  const [kind, setKind] = useState(event?.type ?? 'event.fired');
  const isTopic = kind === 'event.fired';
  const [target, setTarget] = useState(initialTarget);
  const [session, setSession] = useState('');
  const [completion, setCompletion] = useState('');
  const { workspace } = useAcpWorkspace();
  const isSession = target === 'continue' || target === 'new';
  const save = useMutation({
    mutationFn: () =>
      cwdApiFetch(root, '/api/workspace/triggers?root=' + encodeURIComponent(root), {
        method: 'POST',
        body: JSON.stringify({
          name,
          target: isSession ? 'session' : target,
          sessionMode: isSession ? target : undefined,
          sessionId: isSession ? session : undefined,
          onDone: target === 'mission' ? completion : undefined,
          agentName: target === 'mission' ? agent : undefined,
          hitlPolicyName: target === 'notify' ? undefined : policy,
          prompt,
          events: !event && !isTopic ? ['fs.created', 'fs.modified', 'fs.moved'] : [kind],
          [isTopic ? 'topicGlob' : 'pathGlob']: filter,
          enabled: true,
        }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['subscriptions', root] });
      onDone();
    },
  });
  return (
    <form
      className="grid gap-3"
      onSubmit={e => {
        e.preventDefault();
        save.mutate();
      }}>
      <label>
        {t('subscriptions.name')}
        <Input required value={name} onChange={e => setName(e.target.value)} />
      </label>
      {!event && (
        <Select
          aria-label={t('subscriptions.listen')}
          value={kind}
          options={[
            { value: 'event.fired', label: t('subscriptions.topic') },
            { value: 'fs.modified', label: t('subscriptions.path') },
          ]}
          onChange={e => setKind(e.target.value)}
        />
      )}
      <label>
        {t(isTopic ? 'subscriptions.topic' : 'subscriptions.path')}
        <Input required value={filter} onChange={e => setFilter(e.target.value)} />
      </label>
      <Select
        aria-label={t('subscriptions.target')}
        value={target}
        options={(['mission', 'continue', 'new', 'notify'] as const).map(value => ({
          value,
          label: t(`subscriptions.${value}`),
        }))}
        onChange={e => setTarget(e.target.value)}
      />
      {isSession && (
        <Select
          required
          aria-label={t('subscriptions.session')}
          placeholder={t('subscriptions.session')}
          value={session}
          options={Object.entries(sessions).map(([acp, value]) => ({
            value,
            label: workspace.sessions.find(s => s.sessionId === acp)?.title || acp,
          }))}
          onChange={e => setSession(e.target.value)}
        />
      )}
      {target === 'mission' && (
        <label>
          {t('subscriptions.agent')}
          <Select
            required
            value={agent}
            placeholder={t('subscriptions.pickAgent')}
            options={missionAgentNames(agents.data).map(value => ({ value, label: value }))}
            onChange={e => setAgent(e.target.value)}
          />
        </label>
      )}
      {target !== 'notify' && (
        <label>
          {t('subscriptions.policy')}
          <Select
            required
            value={policy}
            placeholder={t('subscriptions.pickPolicy')}
            options={(policies.data ?? []).map(({ name }) => ({ value: name, label: name }))}
            onChange={e => setPolicy(e.target.value)}
          />
        </label>
      )}
      {target === 'mission' && (
        <label>
          {t('subscriptions.completion')}
          <Input value={completion} onChange={e => setCompletion(e.target.value)} />
        </label>
      )}
      <label>
        {t('subscriptions.prompt')}
        <Textarea required value={prompt} onChange={e => setPrompt(e.target.value)} />
      </label>
      {(agents.error || policies.error || save.error) && (
        <InlineNotice variant="error">
          {(agents.error || policies.error || save.error)?.message}
        </InlineNotice>
      )}
      <Button
        type="submit"
        disabled={
          (target === 'mission' && !agent) ||
          (isSession && !session) ||
          (target !== 'notify' && !policy) ||
          save.isPending
        }>
        {t('subscriptions.create')}
      </Button>
    </form>
  );
}
