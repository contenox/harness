import { Badge, ErrorState, InlineNotice, LoadingState, P, Span } from '@contenox/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMissionChangeDiff, useMissionChanges } from '../../../hooks/useMissionChanges';
import {
  basename,
  CHANGE_STATUS_BADGE_VARIANT,
  CHANGE_STATUS_LABEL_KEY,
  dirname,
} from '../../../lib/missionChanges';
import type { MissionChangedFile } from '../../../lib/types';

const MonacoDiffView = lazy(() => import('./MonacoDiffView'));

export interface MissionChangesTabProps {
  missionId: string;
  focusPath?: string | null;
}

export default function MissionChangesTab({ missionId, focusPath }: MissionChangesTabProps) {
  const { t } = useTranslation();
  const changes = useMissionChanges(missionId);
  const [expanded, setExpanded] = useState<string | null>(focusPath ?? null);

  useEffect(() => {
    if (focusPath) setExpanded(focusPath);
  }, [focusPath]);

  if (changes.isAbsent) {
    return (
      <div className="p-1">
        <InlineNotice variant="info">
          <p className="font-medium">{t('changes.unavailable_title')}</p>
          <p className="mt-1 text-xs">{t('changes.unavailable_body')}</p>
        </InlineNotice>
      </div>
    );
  }

  if (changes.isLoading && !changes.data) {
    return <LoadingState message={t('changes.loading')} />;
  }

  if (changes.error) {
    return (
      <ErrorState
        error={changes.error}
        onRetry={changes.refetch}
        title={t('changes.load_error')}
      />
    );
  }

  const files = changes.data?.files ?? [];
  if (files.length === 0) {
    return <P variant="muted">{t('changes.empty')}</P>;
  }

  return (
    <div className="flex flex-col gap-3">
      {files.length > 1 && (
        <Span variant="muted" className="text-xs" title={t('changes.doi_hint_title')}>
          {t('changes.doi_hint')}
        </Span>
      )}

      <ul className="flex flex-col gap-2">
        {files.map(file => (
          <ChangedFileRow
            key={file.path}
            missionId={missionId}
            file={file}
            expanded={expanded === file.path}
            onToggle={() =>
              setExpanded(prev => (prev === file.path ? null : file.path))
            }
          />
        ))}
      </ul>

      {changes.data?.incomplete && (
        <InlineNotice variant="info">{t('changes.incomplete')}</InlineNotice>
      )}
    </div>
  );
}

function ChangedFileRow({
  missionId,
  file,
  expanded,
  onToggle,
}: {
  missionId: string;
  file: MissionChangedFile;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const dir = dirname(file.path);
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <li className="border-surface-200 dark:border-dark-surface-600 rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="hover:bg-surface-100 dark:hover:bg-dark-surface-200 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left">
        <Chevron aria-hidden="true" className="text-text-muted dark:text-dark-text-muted h-4 w-4 shrink-0" />
        <Badge variant={CHANGE_STATUS_BADGE_VARIANT[file.status]} size="sm" className="shrink-0">
          {t(CHANGE_STATUS_LABEL_KEY[file.status])}
        </Badge>
        <span className="min-w-0 truncate font-mono text-sm" title={file.path}>
          {basename(file.path)}
          {dir && (
            <span className="text-text-muted dark:text-dark-text-muted ml-2 text-xs">{dir}</span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-surface-200 dark:border-dark-surface-600 border-t p-3">
          <ChangedFileDiff missionId={missionId} file={file} />
        </div>
      )}
    </li>
  );
}

function ChangedFileDiff({ missionId, file }: { missionId: string; file: MissionChangedFile }) {
  const { t } = useTranslation();
  const diffQuery = useMissionChangeDiff(missionId, file.path);

  if (diffQuery.isLoading) return <LoadingState message={t('changes.diff_loading')} />;
  if (diffQuery.error || !diffQuery.data) {
    return (
      <InlineNotice variant="error">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0">
            {t('changes.diff_error')} {diffQuery.error?.message}
          </span>
        </div>
      </InlineNotice>
    );
  }

  return (
    <Suspense fallback={<LoadingState message={t('changes.diff_loading')} />}>
      <MonacoDiffView path={file.path} status={file.status} diff={diffQuery.data} />
    </Suspense>
  );
}
