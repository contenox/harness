import type { OperatorItemRow } from '@contenox/acp-client';
import { InlineNotice, Page } from '@contenox/ui';
import { Link } from 'react-router-dom';
import { ScreenError, ScreenLoading } from '../saas/ScreenState';
import { ScreenHeader } from '../shell/ScreenHeader';
import { formatDateTime } from '../lib/relativeTime';

export function InboxScreen({
  instanceId,
  rows,
  error,
}: {
  instanceId: string;
  rows: OperatorItemRow[] | null;
  error: string | null;
}) {
  return (
    <Page
      header={
        <ScreenHeader
          title="Inbox"
          actions={
            <Link
              to={`/session/${encodeURIComponent(instanceId)}/missions`}
              className="text-primary-600 dark:text-dark-primary-500 py-1 text-sm">
              Missions
            </Link>
          }
        />
      }>
      {error ? (
        <ScreenError error={error} />
      ) : rows === null ? (
        <ScreenLoading label="Loading inbox" />
      ) : rows.length === 0 ? (
        <div className="p-4">
          <InlineNotice>No unattended attention items.</InlineNotice>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 p-4">
          {rows.map(it => (
            <li
              key={it.id}
              className="border-surface-200 dark:border-dark-surface-600 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-primary dark:text-dark-text-primary truncate font-medium">
                  {it.intent || it.report.summary}
                </span>
                {it.acked && (
                  <span className="text-text-muted dark:text-dark-text-muted shrink-0 font-mono text-xs">
                    acked
                  </span>
                )}
              </div>
              <div className="text-text-muted dark:text-dark-text-muted mt-1 text-xs">
                {it.reason} · {it.agentName || 'native'} · {formatDateTime(it.createdAt)}
              </div>
              {it.report.summary && (
                <div className="text-text-primary dark:text-dark-text-primary mt-1 text-sm">
                  {it.report.summary}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="p-4 pt-0">
        <Link
          to={`/session/${encodeURIComponent(instanceId)}`}
          className="text-primary-600 dark:text-dark-primary-500 text-sm">
          Sessions
        </Link>
      </div>
    </Page>
  );
}
