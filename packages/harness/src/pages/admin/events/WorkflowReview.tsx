import { Button, InlineNotice } from '@contenox/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MonacoDiff from '../../../components/editors/MonacoDiff';
import { languageForPath } from '../../../lib/missionChanges';
import { useCwdPrefix } from '../../../lib/projectRuntime';
import {
  runRoute,
  workflowRequest,
  workflowURL,
  type Change,
  type WorkflowRun,
} from './workflowApi';

function ChangedLines({ change }: { change: Change }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const old = (change.before ?? '').split(/\r?\n/),
    next = (change.after ?? '').split(/\r?\n/);
  let start = 0,
    end = 0;
  while (start < old.length && start < next.length && old[start] === next[start]) start++;
  while (
    end < old.length - start &&
    end < next.length - start &&
    old[old.length - end - 1] === next[next.length - end - 1]
  )
    end++;
  const lines = (rows: string[]) =>
    rows
      .slice(start, rows.length - end)
      .slice(0, 3)
      .join('\n')
      .trim()
      .slice(0, 450);
  return (
    <div className="space-y-1 text-sm">
      <div className="text-text-error break-words whitespace-pre-wrap">
        <span aria-label={t('wf.before')}>− </span>
        {lines(old)}
      </div>
      <div className="text-text-success break-words whitespace-pre-wrap">
        <span aria-label={t('wf.after')}>+ </span>
        {lines(next)}
      </div>
      <details onToggle={e => setExpanded(e.currentTarget.open)}>
        <summary className="cursor-pointer text-xs">{t('wf.diff')}</summary>
        {expanded && (
          <div className="h-64">
            <MonacoDiff
              original={change.before ?? ''}
              modified={change.after ?? ''}
              language={languageForPath(change.path)}
            />
          </div>
        )}
      </details>
    </div>
  );
}
export function WorkflowReview({
  root,
  run,
  refresh,
}: {
  root: string;
  run: WorkflowRun;
  refresh: (r: WorkflowRun) => void;
}) {
  const { t } = useTranslation();
  const prefix = useCwdPrefix(root);
  const decide = useMutation({
    mutationFn: (decision: 'approve' | 'reject') =>
      workflowRequest<WorkflowRun>(root, runRoute(run.id) + '/decision', 'POST', { decision }),
    onSuccess: refresh,
  });
  return (
    <section aria-label={t('wf.review')} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{t(`wf.${run.status}` as const)}</h3>
        <code className="text-xs opacity-75">{run.origin}</code>
      </div>
      {run.summary && <p>{run.summary}</p>}
      {run.error && <InlineNotice variant="error">{run.error}</InlineNotice>}
      {run.model && (
        <p className="text-xs opacity-75">
          {run.model.provider} · {run.model.model} · {(run.model.milliseconds / 1000).toFixed(1)} s
        </p>
      )}
      <ul className="divide-y">
        {run.changes?.map(c => (
          <li key={c.path} className="space-y-1 py-2">
            <strong className="font-mono text-sm">{c.path}</strong>
            {c.path.toLowerCase().endsWith('.pdf') ? (
              prefix !== null && (
                <a
                  className="ml-3 text-sm underline"
                  target="_blank"
                  rel="noreferrer"
                  href={
                    prefix +
                    workflowURL(root, runRoute(run.id) + '/pdf') +
                    '&file=' +
                    encodeURIComponent(c.path)
                  }>
                  {t('wf.pdf')}
                </a>
              )
            ) : (
              <ChangedLines change={c} />
            )}
          </li>
        ))}
      </ul>
      {(run.status === 'pending' || run.status === 'applying') && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={decide.isPending}
            onClick={() => decide.mutate('approve')}>
            {t(run.status === 'pending' ? 'wf.approve' : 'wf.resume')}
          </Button>
          {run.status === 'pending' && (
            <Button disabled={decide.isPending} onClick={() => decide.mutate('reject')}>
              {t('wf.reject')}
            </Button>
          )}
        </div>
      )}
      {decide.error && <InlineNotice variant="error">{decide.error.message}</InlineNotice>}
    </section>
  );
}
