import type { ReactNode } from 'react';
import { Panel } from './Panel';
import { cn } from '../utils';

/**
 * WorkspaceShell provides a fixed header and optional navigation around scrollable content.
 */
export function WorkspaceShell({
  header,
  navigation,
  children,
}: {
  header: ReactNode;
  navigation?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-text flex h-dvh min-h-0 flex-col overflow-hidden">
      <Panel
        variant="surface"
        className="flex h-16 shrink-0 items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-4">
        {header}
      </Panel>
      <div className="flex min-h-0 min-w-0 flex-1">
        {navigation && (
          <aside className="border-surface-300 dark:border-dark-surface-700 bg-surface-50 dark:bg-dark-surface-100 hidden w-60 shrink-0 overflow-y-auto border-r p-2 sm:block lg:w-72">
            {navigation}
          </aside>
        )}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

/**
 * PageContent applies the shared workspace gutter and bounded content width.
 */
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
