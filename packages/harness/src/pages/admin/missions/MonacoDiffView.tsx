import { DiffEditor } from '@monaco-editor/react';
import { Button, InlineNotice, Span } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MonacoView, { MONACO_READONLY_OPTIONS } from '../../../components/editors/MonacoView';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { TranslationKey } from '../../../i18n';
import { defineBeamMonacoThemes, useMonacoAppTheme } from '../../../lib/monacoAppTheme';
import { languageForPath } from '../../../lib/missionChanges';
import type { MissionChangeStatus, MissionFileDiff } from '../../../lib/types';


type DiffView = 'old' | 'diff' | 'new';

export default function MonacoDiffView({
  path,
  status,
  diff,
}: {
  path: string;
  status: MissionChangeStatus;
  diff: MissionFileDiff;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<DiffView>('diff');
  const theme = useMonacoAppTheme();
  const language = languageForPath(path);
  const sideBySide = useMediaQuery('(min-width: 768px)');

  const views: { id: DiffView; labelKey: TranslationKey; titleKey: TranslationKey }[] = [
    { id: 'old', labelKey: 'changes.view_old', titleKey: 'changes.view_old_title' },
    { id: 'diff', labelKey: 'changes.view_diff', titleKey: 'changes.view_diff_title' },
    { id: 'new', labelKey: 'changes.view_new', titleKey: 'changes.view_new_title' },
  ];

  const emptyNote =
    view === 'old' && status === 'added'
      ? t('changes.added_no_old')
      : view === 'new' && status === 'deleted'
        ? t('changes.deleted_no_new')
        : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex gap-1" role="group">
          {views.map(v => (
            <Button
              key={v.id}
              type="button"
              size="xs"
              variant={view === v.id ? 'primary' : 'outline'}
              title={t(v.titleKey)}
              onClick={() => setView(v.id)}>
              {t(v.labelKey)}
            </Button>
          ))}
        </div>
        {diff.truncated && (
          <Span variant="muted" className="text-xs" title={t('changes.diff_truncated')}>
            {t('changes.diff_truncated')}
          </Span>
        )}
      </div>

      {emptyNote ? (
        <InlineNotice variant="info">{emptyNote}</InlineNotice>
      ) : (
        <div className="border-surface-200 dark:border-dark-surface-600 h-[50vh] min-h-[18rem] overflow-hidden rounded-lg border">
          {view === 'diff' ? (
            <DiffEditor
              height="100%"
              original={diff.original}
              modified={diff.modified}
              language={language}
              theme={theme}
              beforeMount={defineBeamMonacoThemes}
              options={{ ...MONACO_READONLY_OPTIONS, renderSideBySide: sideBySide }}
            />
          ) : (
            <MonacoView
              value={view === 'old' ? diff.original : diff.modified}
              language={language}
              className="h-full"
            />
          )}
        </div>
      )}
    </div>
  );
}
