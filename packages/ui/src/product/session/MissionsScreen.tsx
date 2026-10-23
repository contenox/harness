import type { MissionRow, ReportRow } from '@contenox/acp-client';
import { InlineNotice, Page } from '@contenox/ui';
import { Link } from 'react-router-dom';
import { ScreenError, ScreenLoading } from '../saas/ScreenState';
import { ScreenHeader } from '../shell/ScreenHeader';
import { formatDateTime } from '../lib/relativeTime';

export interface MissionDetail {
  mission: MissionRow;
  reports: ReportRow[];
}

export function MissionsScreen({
  instanceId,
  rows,
  error,
  detail,
  detailError,
  onOpenDetail,
}: {
  instanceId: string;
  rows: MissionRow[] | null;
  error: string | null;
  detail: MissionDetail | null;
  detailError: string | null;
  onOpenDetail: (id: string) => void;
}) {
  return (
    <Page
      header={
        <ScreenHeader
          title="Missions"
          actions={
            <Link
              to={`/session/${encodeURIComponent(instanceId)}/inbox`}
              className="text-primary-600 dark:text-dark-primary-500 py-1 text-sm">
              Inbox
            </Link>
          }
        />
      }>
      {error ? (
        <ScreenError error={error} />
      ) : rows === null ? (
        <ScreenLoading label="Loading missions" />
      ) : rows.length === 0 ? (
        <div className="p-4">
          <InlineNotice>No missions on this machine.</InlineNotice>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 p-4">
          {rows.map(m => (
            <li key={m.id}>
              <button
                type="button"
                className="border-surface-200 dark:border-dark-surface-600 hover:bg-surface-50 dark:hover:bg-dark-surface-300 w-full rounded-lg border p-3 text-left"
                onClick={() => onOpenDetail(m.id)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-primary dark:text-dark-text-primary truncate font-medium">
                    {m.intent}
                  </span>
                  <span className="text-text-muted dark:text-dark-text-muted shrink-0 font-mono text-xs">
                    {m.status}
                  </span>
                </div>
                <div className="text-text-muted dark:text-dark-text-muted mt-1 text-xs">
                  {m.agentName} · {formatDateTime(m.updatedAt)}
                  {m.lastError ? ` · ${m.lastError}` : ''}
                </div>
              </button>
              {detail?.mission.id === m.id && (
                <div className="border-surface-200 dark:border-dark-surface-600 mt-1 rounded-lg border p-3">
                  <div className="text-text-muted dark:text-dark-text-muted mb-1 text-xs">
                    Plan rev {detail.mission.plan.revision} ·{' '}
                    {detail.mission.statusReason || 'no status reason'}
                  </div>
                  {detail.mission.plan.entries.length > 0 && (
                    <ol className="text-text-primary dark:text-dark-text-primary mb-2 list-decimal pl-4 text-sm">
                      {detail.mission.plan.entries.map(e => (
                        <li key={e.id}>
                          {e.content}{' '}
                          <span className="text-text-muted dark:text-dark-text-muted">
                            ({e.status})
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {detail.reports.length > 0 && (
                    <div className="border-t border-surface-200 dark:border-dark-surface-600 pt-2">
                      <div className="text-text-muted dark:text-dark-text-muted mb-1 text-xs">
                        Reports
                      </div>
                      {detail.reports.map(r => (
                        <div
                          key={r.id}
                          className="text-text-primary dark:text-dark-text-primary text-sm">
                          <span className="text-text-muted dark:text-dark-text-muted font-mono text-xs">
                            {r.kind}
                          </span>{' '}
                          {r.summary}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {detailError !== null && (
                <div className="mt-1">
                  <InlineNotice variant="error">{detailError}</InlineNotice>
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
