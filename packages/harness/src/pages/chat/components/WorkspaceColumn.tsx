import { Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import { FileTreePanel } from './FileTreePanel';

export interface WorkspaceColumnProps {
  root: string | null;
  files: UseWorkspaceFilesResult;
  selectedFilePath: string | null;
  onOpenFile: (path: string) => void;
}

/**
 * A full-height project column between the session list and the conversation, like the
 * workspace tree of an IDE. The Files pane then becomes the editor (and terminal/diff) column.
 */
export function WorkspaceColumn({
  root,
  files,
  selectedFilePath,
  onOpenFile,
}: WorkspaceColumnProps) {
  const { t } = useTranslation();

  return (
    <aside className="border-line bg-app flex w-60 shrink-0 flex-col border-r">
      <div className="border-line flex h-10 shrink-0 items-center border-b px-3">
        <span className="text-[13px] font-medium">{t('acp_sidebar.workspace')}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {root ? (
          <FileTreePanel
            root={root}
            files={files}
            onOpenFile={onOpenFile}
            selectedFilePath={selectedFilePath}
            compact
          />
        ) : (
          <Span variant="muted" className="block px-2 py-3 text-xs">
            {t('panes.no_project')}
          </Span>
        )}
      </div>
    </aside>
  );
}
