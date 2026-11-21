import { Button, InlineNotice, Select, Spinner } from '@contenox/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../../lib/fetch';
import { WorkflowBindings } from './WorkflowBindings';
import { WorkflowEditor } from './WorkflowEditor';
import { WorkflowReview } from './WorkflowReview';
import {
  definitionRoute,
  runRoute,
  workflowRequest,
  type Definition,
  type WorkflowRun,
} from './workflowApi';

const draft: Definition = {
  name: '',
  revision: '',
  source: 'function run(event) {\n  return "Ready for review";\n}\n',
};
export function Workflows({ root }: { root: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState('');
  const names = useQuery({
    queryKey: ['workflows', root],
    queryFn: () => workflowRequest<string[]>(root, 'workflows'),
    retry: false,
  });
  const name = selected ?? names.data?.[0] ?? '';
  const definition = useQuery({
    queryKey: ['workflow', root, name],
    enabled: !!name,
    queryFn: () => workflowRequest<Definition>(root, definitionRoute(name)),
  });
  const history = useQuery({
    queryKey: ['workflow-runs', root],
    enabled: names.isSuccess,
    queryFn: () => workflowRequest<WorkflowRun[]>(root, 'workflow-runs'),
    refetchInterval: 2500,
  });
  const runs = history.data?.filter(r => r.name === name) ?? [];
  const id = selectedRun || runs[0]?.id;
  const detail = useQuery({
    queryKey: ['workflow-run', root, id, runs.find(r => r.id === id)?.status],
    queryFn: () => workflowRequest<WorkflowRun>(root, runRoute(id!)),
    enabled: !!id,
    refetchInterval: q => (q.state.data?.status === 'running' ? 2000 : false),
  });
  function refresh(r: WorkflowRun) {
    client.setQueryData(['workflow-run', root, r.id, r.status], r);
    setSelectedRun(r.id);
    void client.invalidateQueries({ queryKey: ['workflow-runs', root] });
  }
  if (names.isLoading) return <Spinner />;
  if (names.error) {
    const unavailable = names.error instanceof ApiError && names.error.status === 404;
    return (
      <InlineNotice variant={unavailable ? 'info' : 'error'}>
        {unavailable ? t('wf.unavailable') : names.error.message}
      </InlineNotice>
    );
  }
  const data = name ? definition.data : draft;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Select
          aria-label={t('wf.select')}
          value={name}
          options={[
            ...(names.data ?? []).map(value => ({ value, label: value })),
            { value: '', label: t('wf.new') },
          ]}
          onChange={e => {
            setSelected(e.target.value);
            setSelectedRun('');
          }}
        />
        <Button
          onClick={() => {
            setSelected('');
            setSelectedRun('');
          }}>
          {t('wf.new')}
        </Button>
      </div>
      {(definition.error || history.error || detail.error) && (
        <InlineNotice variant="error">
          {(definition.error || history.error || detail.error)?.message}
        </InlineNotice>
      )}
      {data && (
        <WorkflowEditor
          key={name}
          initial={data}
          root={root}
          onSaved={d => setSelected(d.name)}
          onRun={refresh}
        />
      )}
      {definition.data && (
        <WorkflowBindings key={'bindings-' + name} root={root} definition={definition.data} />
      )}
      {!!runs.length && (
        <label className="flex items-center gap-3 text-sm">
          {t('wf.history')}
          <Select
            value={selectedRun}
            options={[
              { value: '', label: t('wf.latest') },
              ...runs.map(r => ({
                value: r.id,
                label:
                  new Date(r.created).toLocaleTimeString() +
                  ' · ' +
                  t(`wf.${r.status}` as const) +
                  ' · ' +
                  r.origin,
              })),
            ]}
            onChange={e => setSelectedRun(e.target.value)}
          />
        </label>
      )}
      {detail.data && (
        <WorkflowReview key={detail.data.id} root={root} run={detail.data} refresh={refresh} />
      )}
    </div>
  );
}
