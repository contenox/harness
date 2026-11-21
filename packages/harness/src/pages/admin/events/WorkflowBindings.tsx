import { Button, InlineNotice, Input } from '@contenox/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Subscription } from './TriggerForm';
import { workflowRequest, type Definition } from './workflowApi';

type Binding = Subscription & { workflow: string; workflowRevision: string };
export function WorkflowBindings({ root, definition }: { root: string; definition: Definition }) {
  const { t } = useTranslation(),
    client = useQueryClient();
  const [topic, setTopic] = useState('');
  const query = useQuery({
    queryKey: ['subscriptions', root, 'workflow-bindings', definition.name],
    queryFn: async () => {
      const result: Binding[] = [];
      let cursor = '';
      do {
        const page = await workflowRequest<{ triggers: Binding[]; nextCursor?: string }>(
          root,
          'triggers',
          'GET',
          undefined,
          cursor ? { cursor } : {},
        );
        result.push(
          ...page.triggers.filter(r => r.target === 'workflow' && r.workflow === definition.name),
        );
        cursor = page.nextCursor ?? '';
      } while (cursor);
      return result;
    },
  });
  const bind = useMutation({
    mutationFn: (rule?: Binding) =>
      rule
        ? workflowRequest(root, 'triggers/' + encodeURIComponent(rule.id), 'PUT', {
            ...rule,
            workflowRevision: definition.revision,
          })
        : workflowRequest(root, 'triggers', 'POST', {
            target: 'workflow',
            name: definition.name + ' · ' + topic.trim(),
            events: ['event.fired'],
            topicGlob: topic.trim(),
            workflow: definition.name,
            workflowRevision: definition.revision,
          }),
    onSuccess: () => {
      setTopic('');
      void client.invalidateQueries({ queryKey: ['subscriptions', root] });
    },
  });
  return (
    <details>
      <summary className="cursor-pointer py-2 text-sm font-medium">{t('wf.triggers')}</summary>
      <div className="space-y-2">
        {query.data?.map(rule => (
          <div key={rule.id} className="flex items-center gap-2">
            <code>{rule.topicGlob || rule.pathGlob}</code>
            {rule.workflowRevision !== definition.revision && (
              <Button onClick={() => bind.mutate(rule)} disabled={bind.isPending}>
                {t('wf.rebind')}
              </Button>
            )}
          </div>
        ))}
        <form
          className="flex items-end gap-2"
          onSubmit={e => {
            e.preventDefault();
            bind.mutate(undefined);
          }}>
          <label>
            {t('subscriptions.topic')}
            <Input required value={topic} onChange={e => setTopic(e.target.value)} />
          </label>
          <Button type="submit" disabled={!topic.trim() || bind.isPending}>
            {t('wf.bind')}
          </Button>
        </form>
        {(query.error || bind.error) && (
          <InlineNotice variant="error">{(query.error || bind.error)?.message}</InlineNotice>
        )}
      </div>
    </details>
  );
}
