import { Button, InlineNotice, Input, Textarea } from '@contenox/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MonacoView from '../../../components/editors/MonacoView';
import { definitionRoute, workflowRequest, type Definition, type WorkflowRun } from './workflowApi';

export function WorkflowEditor({
  root,
  initial,
  onSaved,
  onRun,
}: {
  root: string;
  initial: Definition;
  onSaved: (d: Definition) => void;
  onRun: (r: WorkflowRun) => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [name, setName] = useState(initial.name);
  const [source, setSource] = useState(initial.source);
  const [event, setEvent] = useState('{}');
  const [base, setBase] = useState(initial);
  const [expanded, setExpanded] = useState(!initial.revision);
  const dirty = source !== base.source || !base.revision;
  const save = useMutation({
    mutationFn: () =>
      workflowRequest<Definition>(root, definitionRoute(name), 'PUT', {
        source,
        revision: base.revision,
      }),
    onSuccess: d => {
      setBase(d);
      client.setQueryData(['workflow', root, d.name], d);
      void client.invalidateQueries({ queryKey: ['workflows', root] });
      onSaved(d);
    },
  });
  const run = useMutation({
    mutationFn: () =>
      workflowRequest<WorkflowRun>(root, definitionRoute(name) + '/run', 'POST', {
        revision: base.revision,
        event: JSON.parse(event),
      }),
    onSuccess: onRun,
  });
  const saveSource = () => {
    if (dirty && name && !save.isPending) save.mutate();
  };
  return (
    <section className="flex flex-col gap-3">
      {!initial.revision && (
        <label>
          {t('wf.name')}
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="my-workflow" />
        </label>
      )}
      <details open={expanded} onToggle={e => setExpanded(e.currentTarget.open)}>
        <summary className="cursor-pointer py-2 text-sm font-medium">
          {t('wf.edit')} <code>workflows/{name || '…'}.js</code>
        </summary>
        {expanded && (
          <div className="flex flex-col gap-2">
            <p className="text-sm opacity-75">{t('wf.api')}</p>
            <MonacoView
              value={source}
              language="javascript"
              onChange={setSource}
              onSave={saveSource}
              className="h-72 overflow-hidden rounded border"
              options={{ readOnly: false, ariaLabel: t('wf.source'), lineNumbers: 'on' }}
            />
            <Button
              className="self-start"
              onClick={saveSource}
              disabled={!name || !dirty || save.isPending}>
              {t('wf.save')}
            </Button>
            {save.error && (
              <>
                <InlineNotice variant="error">{save.error.message}</InlineNotice>
                <Button
                  onClick={async () => {
                    const d = await client.fetchQuery({
                      queryKey: ['workflow', root, name],
                      queryFn: () => workflowRequest<Definition>(root, definitionRoute(name)),
                      staleTime: 0,
                    });
                    setBase(d);
                    setSource(d.source);
                    save.reset();
                  }}>
                  {t('wf.reload')}
                </Button>
              </>
            )}
          </div>
        )}
      </details>
      {initial.revision && (
        <details>
          <summary className="cursor-pointer py-2 text-sm font-medium">{t('wf.manual')}</summary>
          <label>
            {t('wf.event')}
            <Textarea value={event} onChange={e => setEvent(e.target.value)} rows={3} />
          </label>
          <Button onClick={() => run.mutate()} disabled={dirty || run.isPending}>
            {t(run.isPending ? 'wf.running' : 'wf.run')}
          </Button>
          {run.error && <InlineNotice variant="error">{run.error.message}</InlineNotice>}
        </details>
      )}
    </section>
  );
}
