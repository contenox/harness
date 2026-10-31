import type { ReactNode } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { PaneKind } from '../lib/panes';
import { RightPaneRegion } from './RightPaneRegion';

export interface ChatSessionViewProps {
  header: ReactNode;
  workspaceTree?: ReactNode;
  transcript: ReactNode;
  composer: ReactNode;
  pane: PaneKind | null;
  paneContent: ReactNode;
}

/** Layout only: banners on top, the workspace column on the left, transcript + composer in the middle, the optional pane on the right. */
export function ChatSessionView({
  header,
  workspaceTree,
  transcript,
  composer,
  pane,
  paneContent,
}: ChatSessionViewProps) {
  const showWorkspace = useMediaQuery('(min-width: 1280px)');

  return (
    <div className="bg-app flex h-full min-h-0 flex-col">
      {header}
      <div className="flex min-h-0 flex-1">
        {showWorkspace && workspaceTree}
        <RightPaneRegion pane={pane} paneContent={paneContent} className="flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {transcript}
            {composer}
          </div>
        </RightPaneRegion>
      </div>
    </div>
  );
}
