import type { ReactNode } from 'react';
import { cn } from '../utils';

export type WorkspaceShellProps = {
  /** Legacy simple header; ignored when `titleBar` is set. */
  header?: ReactNode;
  /** Legacy always-visible navigation; use `sidebar` for the collapsible one. */
  navigation?: ReactNode;
  /** Full-width top bar, usually a `TitleBar`. */
  titleBar?: ReactNode;
  /** Collapsible left sidebar (full height under the title bar). */
  sidebar?: ReactNode;
  sidebarOpen?: boolean;
  /** Called when the mobile backdrop is tapped. */
  onSidebarClose?: () => void;
  /** Optional right-hand pane beside the main content. */
  rightPane?: ReactNode;
  /** Main area scrolls itself (default). Set false when content manages its own scrolling. */
  scroll?: boolean;
  className?: string;
  children: ReactNode;
};

export function WorkspaceShell({
  header,
  navigation,
  titleBar,
  sidebar,
  sidebarOpen = true,
  onSidebarClose,
  rightPane,
  scroll = true,
  className,
  children,
}: WorkspaceShellProps) {
  return (
    <div className={cn('flex h-dvh min-h-0 flex-col overflow-hidden bg-app text-text', className)}>
      {titleBar ?? (
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-app px-4">
          {header}
        </header>
      )}
      <div className="relative flex min-h-0 min-w-0 flex-1">
        {navigation && (
          <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-line bg-sidebar p-2 sm:block lg:w-64">
            {navigation}
          </aside>
        )}
        {sidebar && (
          <>
            {sidebarOpen && (
              <div
                aria-hidden
                onClick={onSidebarClose}
                className="fixed inset-x-0 top-12 bottom-0 z-30 bg-scrim sm:hidden"
              />
            )}
            <aside
              data-state={sidebarOpen ? 'open' : 'closed'}
              className={cn(
                'min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-line bg-sidebar',
                sidebarOpen ? 'fixed top-12 bottom-0 left-0 z-40 flex sm:static sm:z-auto' : 'hidden',
              )}>
              {sidebar}
            </aside>
          </>
        )}
        <main className={cn('min-h-0 min-w-0 flex-1', scroll ? 'overflow-y-auto' : 'overflow-hidden')}>
          {children}
        </main>
        {rightPane && (
          <aside className="flex min-h-0 shrink-0 flex-col border-l border-line bg-app">{rightPane}</aside>
        )}
      </div>
    </div>
  );
}

export function PageContent({
  children,
  narrow = false,
  className,
}: {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full min-w-0 space-y-6 p-4 sm:p-6 lg:p-8',
        narrow ? 'max-w-2xl' : 'max-w-7xl',
        className,
      )}>
      {children}
    </div>
  );
}
