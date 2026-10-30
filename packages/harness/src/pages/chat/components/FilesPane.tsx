import { PaneFrame, Tabs, type Tab } from '@contenox/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import type { PaneAction, PaneState } from '../lib/panes';
import { FileTreePanel } from './FileTreePanel';
import { FileViewTab } from './FileViewTab';
import { PaneNotice } from './PaneNotice';

export interface FilesPaneProps {
  root: string | null;
  files: UseWorkspaceFilesResult;
  state: PaneState;
  dispatch: (action: PaneAction) => void;
  onClose: () => void;
}

function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

/** File tree on top; opened files as tabs with the Monaco viewer below. */
export function FilesPane({ root, files, state, dispatch, onClose }: FilesPaneProps) {
  const { t } = useTranslation();
  const activeFile = state.activeFile;
  const tabs = useMemo<Tab[]>(
    () =>
      state.files.map(path => ({
        id: path,
        label: <span className="block max-w-[12rem] truncate">{baseName(path)}</span>,
        closable: true,
        closeLabel: t('canvas.close_tab', { name: baseName(path) }),
      })),
    [state.files, t],
  );

  return (
    <PaneFrame flush title={t('panes.files')} onClose={onClose} closeLabel={t('panes.close')} bodyClassName="flex flex-col overflow-hidden">
      {root ? (
        <>
          <div className={activeFile != null ? 'flex h-[40%] min-h-0 shrink-0 flex-col border-b border-line' : 'flex min-h-0 flex-1 flex-col'}>
            <FileTreePanel
              root={root}
              files={files}
              onOpenFile={path => dispatch({ type: 'openFile', path })}
              selectedFilePath={activeFile}
            />
          </div>
          {activeFile != null && (
            <div className="flex min-h-0 flex-1 flex-col">
              <Tabs
                tabs={tabs}
                activeTab={activeFile}
                onTabChange={path => dispatch({ type: 'focusFile', path })}
                onClose={path => dispatch({ type: 'closeFile', path })}
                className="shrink-0 border-b border-line px-2"
              />
              <div className="flex min-h-0 flex-1 flex-col p-2">
                <FileViewTab key={activeFile} path={activeFile} readFile={files.readFile} />
              </div>
            </div>
          )}
        </>
      ) : (
        <PaneNotice>{t('panes.no_project')}</PaneNotice>
      )}
    </PaneFrame>
  );
}
