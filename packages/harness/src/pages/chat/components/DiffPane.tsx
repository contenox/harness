import { Button, DiffView, diffLinesFromTexts, PaneFrame, SidebarItem } from '@contenox/ui';
import { FolderOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aggregateSessionDiffs, type SessionDiffSource } from '../lib/sessionDiffs';
import { PaneNotice } from './PaneNotice';

export interface DiffPaneProps {
  session: SessionDiffSource;
  onOpenFile: (path: string) => void;
  onClose: () => void;
}

/** Files changed in this session (first old text to last new text), list on top, diff below. */
export function DiffPane({ session, onOpenFile, onClose }: DiffPaneProps) {
  const { t } = useTranslation();
  const { items, toolCalls } = session;
  const diffs = useMemo(() => aggregateSessionDiffs({ items, toolCalls }), [items, toolCalls]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const selected = diffs.find(d => d.path === selectedPath) ?? diffs[0] ?? null;
  const lines = useMemo(
    () => (selected ? diffLinesFromTexts(selected.oldText, selected.newText) : []),
    [selected],
  );

  return (
    <PaneFrame
      title={t('panes.diff')}
      onClose={onClose}
      closeLabel={t('panes.close')}
      actions={
        selected && (
          <Button type="button" variant="ghost" size="xs" onClick={() => onOpenFile(selected.path)}>
            <FolderOpen className="mr-1 size-3" aria-hidden />
            {t('panes.diff_open_file')}
          </Button>
        )
      }>
      {selected ? (
        <>
          <nav aria-label={t('panes.diff_list_label')} className="mb-3 max-h-48 overflow-y-auto">
            {diffs.map(d => (
              <SidebarItem
                key={d.path}
                active={d.path === selected.path}
                title={d.path}
                meta={d.changes > 1 ? t('panes.diff_changes', { count: d.changes }) : undefined}
                onClick={() => setSelectedPath(d.path)}>
                {d.path}
              </SidebarItem>
            ))}
          </nav>
          <DiffView filePath={selected.path} lines={lines} />
        </>
      ) : (
        <PaneNotice>{t('panes.diff_empty')}</PaneNotice>
      )}
    </PaneFrame>
  );
}
