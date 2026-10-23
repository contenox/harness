import { cn } from '../../../utils';
import { Panel } from '../../../components/Panel';
import { ChevronRight, File as FileIcon, Folder } from 'lucide-react';
import type { MentionCandidate } from '../lib/mentions';

export interface MentionMenuProps {
  entries: MentionCandidate[];
  /**
   * The directory being browsed (root is `''`) — shown as a breadcrumb header.
   */
  scope: string;
  /**
   * Listing not yet loaded for the browsed directory.
   */
  loading: boolean;
  activeIndex: number;
  onPick: (entry: MentionCandidate) => void;
  onHoverIndex?: (index: number) => void;
}

/**
 * The `@`-mention browser — pure presentation.
 */
export function MentionMenu({
  entries,
  scope,
  loading,
  activeIndex,
  onPick,
  onHoverIndex,
}: MentionMenuProps) {
  return (
    <Panel variant="surface" className="max-h-48 overflow-y-auto overscroll-contain p-0">
      <div role="listbox" aria-label="Workspace files">
        {scope !== '' && (
          <div className="border-surface-200 dark:border-dark-surface-600 text-text-muted dark:text-dark-text-muted sticky top-0 border-b bg-inherit px-3 py-1.5 font-mono text-xs">
            {scope}/
          </div>
        )}
        {loading && entries.length === 0 ? (
          <div className="text-text-muted dark:text-dark-text-muted px-3 py-2 text-xs">
            Loading…
          </div>
        ) : (
          entries.map((entry, i) => (
            <button
              key={entry.path}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => onHoverIndex?.(i)}


              onMouseDown={e => {
                e.preventDefault();
                onPick(entry);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                i === activeIndex
                  ? 'bg-primary-50 dark:bg-dark-primary-900'
                  : 'hover:bg-surface-100 dark:hover:bg-dark-surface-300',
              )}>
              {entry.isDirectory ? (
                <Folder
                  className="text-primary-500 dark:text-dark-primary h-3.5 w-3.5 shrink-0"
                  aria-hidden
                />
              ) : (
                <FileIcon
                  className="text-text-muted dark:text-dark-text-muted h-3.5 w-3.5 shrink-0"
                  aria-hidden
                />
              )}
              <span className="text-text dark:text-dark-text min-w-0 flex-1 truncate font-mono text-xs font-medium">
                {entry.name}
                {entry.isDirectory && '/'}
              </span>
              {entry.isDirectory && (
                <ChevronRight
                  className="text-text-muted dark:text-dark-text-muted h-3.5 w-3.5 shrink-0"
                  aria-hidden
                />
              )}
            </button>
          ))
        )}
      </div>
    </Panel>
  );
}
