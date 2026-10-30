import type { ReactNode } from 'react';
import type { PaneKind } from '../lib/panes';
import { RightPaneRegion } from './RightPaneRegion';

export interface ChatSessionViewProps {
  header: ReactNode;
  transcript: ReactNode;
  composer: ReactNode;
  pane: PaneKind | null;
  paneContent: ReactNode;
}

/** Layout only: banners on top, transcript + composer on the left, the optional pane on the right. */
export function ChatSessionView({ header, transcript, composer, pane, paneContent }: ChatSessionViewProps) {
  return (
    <div className="bg-app flex h-full min-h-0 flex-col">
      {header}
      <div className="flex min-h-0 flex-1">
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
