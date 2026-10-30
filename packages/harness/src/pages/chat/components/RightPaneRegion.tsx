import { cn, ResizablePanel, ResizablePanelGroup, ResizablePanelHandle } from '@contenox/ui';
import type { ReactNode } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { PaneKind } from '../lib/panes';

const SIDE_BY_SIDE_QUERY = '(min-width: 1100px)';

export interface RightPaneRegionProps {
  /** The open pane, or null for the plain transcript. */
  pane: PaneKind | null;
  /** The open pane (a PaneFrame that owns its own header and close button). */
  paneContent: ReactNode;
  /** Transcript + composer. */
  children: ReactNode;
  className?: string;
}

/** Transcript on the left, the selected pane on the right (resizable split at 1100px and up, so the chat keeps at least 360px; below that it replaces the transcript). */
export function RightPaneRegion({ pane, paneContent, children, className }: RightPaneRegionProps) {
  const sideBySide = useMediaQuery(SIDE_BY_SIDE_QUERY);

  if (pane === null) {
    return <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}>{children}</div>;
  }

  if (!sideBySide) {
    return (
      <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}>
        <div className="hidden">{children}</div>
        {paneContent}
      </div>
    );
  }

  return (
    <ResizablePanelGroup className={cn('min-w-0 flex-1', className)}>
      <ResizablePanel minSize={360} className="flex min-h-0 flex-col">{children}</ResizablePanel>
      <ResizablePanelHandle orientation="horizontal" />
      <ResizablePanel defaultSize="480px" minSize={320} maxSize={960} className="flex min-h-0 flex-col">
        {paneContent}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
