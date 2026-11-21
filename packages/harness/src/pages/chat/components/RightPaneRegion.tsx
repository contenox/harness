import { cn, ResizablePanelHandle } from '@contenox/ui';
import type { ReactNode } from 'react';
import type { PaneKind } from '../lib/panes';
import styles from './RightPaneRegion.module.css';

export interface RightPaneRegionProps {
  pane: PaneKind | null;
  paneContent: ReactNode;
  children: ReactNode;
  className?: string;
}

export function RightPaneRegion({ pane, paneContent, children, className }: RightPaneRegionProps) {
  return (
    <div className={cn(styles.region, className)}>
      <div className={styles.split} data-pane={pane ?? undefined}>
        <div className={styles.conversation}>{children}</div>
        {pane && (
          <>
            <ResizablePanelHandle orientation="horizontal" className={styles.handle} />
            <div className={styles.pane}>{paneContent}</div>
          </>
        )}
      </div>
    </div>
  );
}
