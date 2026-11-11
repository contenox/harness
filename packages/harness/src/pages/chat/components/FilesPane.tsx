import {
  PaneFrame,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelHandle,
  Tabs,
  type Tab,
} from '@contenox/ui';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import { isDirty } from '../../../lib/editorBuffers';
import type { PaneAction, PaneState } from '../lib/panes';
import { DiscardChangesDialog } from './DiscardChangesDialog';
import { FileEditorTab } from './FileEditorTab';
import { FileTreePanel } from './FileTreePanel';
import { PaneNotice } from './PaneNotice';

export interface FilesPaneProps {
  root: string | null;
  files: UseWorkspaceFilesResult;
  state: PaneState;
  dispatch: (action: PaneAction) => void;
  onOpenFile: (path: string) => void;
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
export function FilesPane({
  root,
  files,
  state,
  dispatch,
  onOpenFile,
  onClose,
  paneTabs,
}: FilesPaneProps) {
  const { t } = useTranslation();
  const wide = useMediaQuery('(min-width: 1280px)');
  const activeFile = state.activeFile;
  const { editor } = files;
  const { open: openBuffer } = editor;
  const [closing, setClosing] = useState<string | null>(null);

  const { buffers } = editor;
  useEffect(() => {
    for (const path of state.files) {
      if (!buffers[path]) openBuffer(path);
    }
  }, [state.files, buffers, openBuffer]);

  const tabs = useMemo<Tab[]>(
    () =>
      state.files.map(path => {
        const dirty = isDirty(editor.buffers[path]);
        return {
          id: path,
          label: (
            <span className="flex max-w-[12rem] items-center gap-1">
              <span className="truncate">{baseName(path)}</span>
              {dirty && (
                <span
                  aria-label={t('editor.unsaved')}
                  className="bg-text-muted size-1.5 shrink-0 rounded-full"
                />
              )}
            </span>
          ),
          closable: true,
          closeLabel: t('canvas.close_tab', { name: baseName(path) }),
        };
      }),
    [state.files, editor.buffers, t],
  );

  const closeNow = (path: string) => {
    editor.close(path);
    dispatch({ type: 'closeFile', path });
  };
  const requestClose = (path: string) => {
    if (isDirty(editor.buffers[path])) setClosing(path);
    else closeNow(path);
  };

  const tree = (
    <FileTreePanel
      root={root}
      files={files}
      onOpenFile={onOpenFile}
      selectedFilePath={activeFile}
      onPathMoved={(from, to) => dispatch({ type: 'movePath', from, to })}
      onPathDeleted={path => dispatch({ type: 'closeUnder', path })}
    />
  );

  const editorView =
    activeFile == null ? null : (
      <div className="flex min-h-0 flex-1 flex-col">
        <Tabs
          tabs={tabs}
          activeTab={activeFile}
          onTabChange={path => dispatch({ type: 'focusFile', path })}
          onClose={requestClose}
          className="border-line shrink-0 border-b px-2"
        />
        <div className="flex min-h-0 flex-1 flex-col p-2">
          <FileEditorTab key={activeFile} path={activeFile} editor={editor} />
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
      <DiscardChangesDialog
        name={closing ? baseName(closing) : null}
        onCancel={() => setClosing(null)}
        onDiscard={() => {
          if (closing) closeNow(closing);
          setClosing(null);
        }}
        onSave={() => {
          const path = closing;
          setClosing(null);
          if (!path) return;
          void editor.save(path).then(saved => {
            if (saved) closeNow(path);
          });
        }}
      />
      {root ? (
        wide ? (
          (editorView ?? <PaneNotice>{t('panes.pick_file')}</PaneNotice>)
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
              {editorView}
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
