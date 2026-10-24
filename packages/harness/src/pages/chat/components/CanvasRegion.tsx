import {
  Button,
  cn,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelHandle,
  TabPanel,
  TabPanels,
  Tabs,
  type Tab,
} from '@contenox/ui';
import { Terminal } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseCanvasTabsResult } from '../../../hooks/useCanvasTabs';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { WorkspaceFilePeek } from '../../../hooks/useWorkspaceFiles';
import { TERMINAL_CANVAS_TAB, type CanvasTab } from '../lib/canvasTabs';
import { FileViewTab } from './FileViewTab';
import { TerminalTab } from './TerminalTab';

const SIDE_BY_SIDE_QUERY = '(min-width: 1024px)';

export interface CanvasRegionProps {
  sessionId: string | null;
  canvas: UseCanvasTabsResult;
  readFile: (path: string) => Promise<WorkspaceFilePeek>;
  children: ReactNode;
  className?: string;
}

export function CanvasRegion({
  sessionId,
  canvas,
  readFile,
  children,
  className,
}: CanvasRegionProps) {
  const { t } = useTranslation();
  const sideBySide = useMediaQuery(SIDE_BY_SIDE_QUERY);
  const { open, close } = canvas;

  const terminalOpen = canvas.tabs.some(tab => tab.id === TERMINAL_CANVAS_TAB.id);
  const toggleTerminal = useCallback(
    () => (terminalOpen ? close(TERMINAL_CANVAS_TAB.id) : open(TERMINAL_CANVAS_TAB)),
    [terminalOpen, open, close],
  );

  const terminalLabel = terminalOpen ? t('terminal.close_in_canvas') : t('terminal.open_in_canvas');
  const openTerminalButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={terminalOpen}
      aria-label={terminalLabel}
      title={terminalLabel}
      className={
        terminalOpen
          ? 'bg-surface-200 text-text dark:bg-dark-surface-300 dark:text-dark-text'
          : undefined
      }
      onClick={toggleTerminal}>
      <Terminal className="h-4 w-4" />
    </Button>
  );

  if (canvas.tabs.length === 0) {
    return (
      <div className={cn('flex min-h-0 min-w-0 flex-1', className)}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        <div className="border-surface-200 dark:border-dark-surface-600 hidden shrink-0 flex-col items-center gap-1 border-l px-1 py-2 sm:flex">
          {openTerminalButton}
        </div>
      </div>
    );
  }

  const tabLabel = (tab: CanvasTab): string => {
    switch (tab.kind) {
      case 'terminal':
        return t('terminal.panel_title');
      case 'file':
        return tab.title ?? tab.path ?? tab.id;
      default:
        return tab.id;
    }
  };

  const stripTabs: Tab[] = canvas.tabs.map(tab => {
    const label = tabLabel(tab);
    return {
      id: tab.id,
      label: <span className="block max-w-[12rem] truncate">{label}</span>,
      closable: true,
      closeLabel: t('canvas.close_tab', { name: label }),
    };
  });
  const activeId = canvas.activeId ?? '';

  const surface = (
    <div className="bg-surface dark:bg-dark-surface flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="border-surface-200 dark:border-dark-surface-600 flex shrink-0 items-center gap-1 border-b px-2">
        <Tabs
          tabs={stripTabs}
          activeTab={activeId}
          onTabChange={canvas.focus}
          onClose={canvas.close}
          className="min-w-0 flex-1 flex-nowrap"
        />
        <span className="shrink-0">{openTerminalButton}</span>
      </div>
      <TabPanels>
        {canvas.tabs.map(tab => (
          <TabPanel
            key={tab.id}
            tabId={tab.id}
            activeTab={activeId}
            className="flex min-h-0 flex-col p-2">
            {tab.kind === 'terminal' && <TerminalTab sessionId={sessionId} />}
            {tab.kind === 'file' && tab.path && <FileViewTab path={tab.path} readFile={readFile} />}
          </TabPanel>
        ))}
      </TabPanels>
    </div>
  );

  if (!sideBySide) {
    return (
      <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}>
        <div className="hidden">{children}</div>
        {surface}
      </div>
    );
  }

  return (
    <ResizablePanelGroup className={cn('min-w-0 flex-1', className)}>
      <ResizablePanel className="flex min-h-0 flex-col">{children}</ResizablePanel>
      <ResizablePanelHandle orientation="horizontal" />
      <ResizablePanel
        defaultSize="480px"
        minSize={320}
        maxSize={960}
        className="border-surface-200 dark:border-dark-surface-600 flex min-h-0 flex-col border-l">
        {surface}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
