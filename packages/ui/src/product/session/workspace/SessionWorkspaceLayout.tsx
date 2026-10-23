import type { AssetAction, AssetActionResult } from '@contenox/acp-client';
import { useState, type ReactNode } from 'react';
import { MentionMenu } from '../composer/MentionMenu';
import type { AcpSessionState } from '../state/acpSessionState';
import type { UseMentionMenuResult } from '../hooks/useMentionMenu';
import { useMediaQuery } from '../lib/useMediaQuery';
import { ActivityPanel } from '../activity/ActivityPanel';
import { CanvasTabStrip, FilePane, FileTreePanel, type FileTreeManagement } from './FileCanvas';
import { activeFileTab } from './fileCanvasState';
import type { SessionWorkspace } from './useSessionWorkspace';

/** The machine's asset actions, offered on a previewed file only where the session serves them. */
export interface AssetActionsSource {
  list: () => Promise<AssetAction[]>;
  run: (action: string, path: string) => Promise<AssetActionResult>;
}

export interface SessionWorkspaceLayoutProps {
  workspace: SessionWorkspace;
  session: AcpSessionState;
  /** The conversation column: transcript, approvals and composer. */
  chat: ReactNode;
  /** Absent where the session serves no asset actions; the preview then offers none. */
  assetActions?: AssetActionsSource;
  /** Absent where the tree is read-only; present, it adds the file-management controls to the tree. */
  management?: FileTreeManagement;
}

/**
 * The tree, the Chat and Activity tabs, the open files and their preview, laid
 * out around a conversation. Wide screens keep the tree and a preview pane
 * beside the chat; a narrow one shows the tree on demand and one pane at a time.
 * The wide preview pane stays even with nothing open, so closing the last tab
 * does not rearrange the screen.
 */
export function SessionWorkspaceLayout({
  workspace,
  session,
  chat,
  assetActions,
  management,
}: SessionWorkspaceLayoutProps) {
  const { canvas, files } = workspace;
  const isWide = useMediaQuery('(min-width: 1024px)');
  const [activityOpen, setActivityOpen] = useState(false);
  const file = activeFileTab(canvas.state);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {(canvas.state.panelOpen || isWide) && (
        <FileTreePanel
          cache={files.cache}
          ensureLoaded={files.ensureLoaded}
          isLoading={files.isLoading}
          onOpenFile={canvas.openFile}
          listDir={workspace.listDir}
          manage={management}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CanvasTabStrip
          tabs={canvas.state.tabs}
          activePath={canvas.state.activePath}
          onSelect={path => {
            setActivityOpen(false);
            canvas.activate(path);
          }}
          onClose={canvas.closeFile}
          views={[
            {
              id: 'chat',
              label: 'Chat',
              active: !activityOpen && canvas.state.activePath === '',
              onSelect: () => {
                setActivityOpen(false);
                canvas.activate('');
              },
            },
            {
              id: 'activity',
              label: 'Activity',
              active: activityOpen,
              onSelect: () => setActivityOpen(true),
            },
          ]}
          showFileTabs={!activityOpen}
        />
        {activityOpen ? (
          <ActivityPanel session={session} />
        ) : file || isWide ? (
          <div className="flex min-h-0 flex-1">
            <div
              className={
                file ? 'hidden min-h-0 flex-1 flex-col lg:flex' : 'flex min-h-0 flex-1 flex-col'
              }>
              {chat}
            </div>
            {file ? (
              <div className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden lg:w-[min(560px,46vw)] lg:min-w-[360px] lg:border-l lg:border-surface-200 dark:lg:border-dark-surface-600">
                <FilePane
                  tab={file}
                  onAskSelection={workspace.askAboutSelection}
                  onWrite={workspace.saveFile}
                  listAssetActions={assetActions?.list}
                  runAssetAction={assetActions?.run}
                  onOpenArtifact={canvas.openFile}
                />
              </div>
            ) : (
              <div className="hidden w-[min(400px,38vw)] min-w-[320px] shrink-0 flex-col items-center justify-center gap-3 border-l border-surface-200 p-6 dark:border-dark-surface-600 lg:flex">
                <span className="text-text-muted dark:text-dark-text-muted max-w-60 text-center text-sm">
                  {assetActions
                    ? 'Nothing open — pick a file from the tree. Preview, editing and asset actions happen here.'
                    : 'Nothing open — pick a file from the tree. Preview and editing happen here.'}
                </span>
              </div>
            )}
          </div>
        ) : (
          chat
        )}
      </div>
    </div>
  );
}

/** The `@` mention browser, shown while a mention is being typed. */
export function SessionMentionMenu({ menu }: { menu: UseMentionMenuResult }) {
  if (!menu.open) return null;
  return (
    <MentionMenu
      entries={menu.entries}
      scope={menu.scope}
      loading={menu.loading}
      activeIndex={menu.activeIndex}
      onPick={menu.pick}
      onHoverIndex={menu.setActiveIndex}
    />
  );
}
