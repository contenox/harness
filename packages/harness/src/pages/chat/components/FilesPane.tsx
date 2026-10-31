import {
  PaneFrame,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelHandle,
  Tabs,
  type Tab,
} from '@contenox/ui';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
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
  /** Work-surface tab strip supplied by the session; replaces the pane title. */
  paneTabs?: ReactNode;
}

function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

/**
 * Opened files as tabs with the Monaco viewer. On wide windows the project tree lives in the
 * workspace column, so the pane is editor-only; on narrow windows it keeps its own
 * resizable tree above the editor.
 */
export function FilesPane({ root, files, state, dispatch, onClose, paneTabs }: FilesPaneProps) {
  const { t } = useTranslation();
  const wide = useMediaQuery('(min-width: 1280px)');
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

  const tree = (
    <FileTreePanel
      root={root}
      files={files}
      onOpenFile={path => dispatch({ type: 'openFile', path })}
      selectedFilePath={activeFile}
    />
  );

  const editor =
    activeFile == null ? null : (
      <div className="flex min-h-0 flex-1 flex-col">
        <Tabs
          tabs={tabs}
          activeTab={activeFile}
          onTabChange={path => dispatch({ type: 'focusFile', path })}
          onClose={path => dispatch({ type: 'closeFile', path })}
          className="border-line shrink-0 border-b px-2"
        />
        <div className="flex min-h-0 flex-1 flex-col p-2">
          <FileViewTab key={activeFile} path={activeFile} readFile={files.readFile} />
        </div>
      </div>
    );

  return (
    <PaneFrame
      flush
      title={paneTabs ? undefined : t('panes.files')}
      tabs={paneTabs}
      onClose={onClose}
      closeLabel={t('panes.close')}
      bodyClassName="flex flex-col overflow-hidden">
      {root ? (
        wide ? (
          (editor ?? <PaneNotice>{t('panes.pick_file')}</PaneNotice>)
        ) : activeFile != null ? (
          <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
            <ResizablePanel className="flex min-h-0 flex-col" style={{ minHeight: 80 }}>
              {tree}
            </ResizablePanel>
            <ResizablePanelHandle orientation="vertical" aria-label={t('panes.resize_editor')} />
            <ResizablePanel
              defaultSize="60%"
              className="flex min-h-0 flex-col"
              style={{ minHeight: 160 }}>
              {editor}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{tree}</div>
        )
      ) : (
        <PaneNotice>{t('panes.no_project')}</PaneNotice>
      )}
    </PaneFrame>
  );
}
