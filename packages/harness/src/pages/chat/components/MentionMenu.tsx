import { cn } from '@contenox/ui';
import { ChevronRight, File as FileIcon, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FilePreviewState } from '../lib/filePreview';
import { type MentionCandidate } from '../lib/mentions';
import { MentionFilePreview } from './MentionFilePreview';

export interface MentionMenuProps {
  entries: MentionCandidate[];
  scope: string;
  loading: boolean;
  activeIndex: number;
  onPick: (entry: MentionCandidate) => void;
  onHoverIndex?: (index: number) => void;
  preview: FilePreviewState;
}

export function MentionMenu({
  entries,
  scope,
  loading,
  activeIndex,
  onPick,
  onHoverIndex,
  preview,
}: MentionMenuProps) {
  const { t } = useTranslation();

  return (
    <div className="border-line bg-raised absolute bottom-full left-0 z-20 mb-2 flex max-h-[60vh] min-h-0 w-full flex-col overflow-hidden rounded-lg border shadow-lg sm:w-96">
      <MentionFilePreview state={preview} />
      <div
        role="listbox"
        aria-label={t('workspace.mention_menu_label')}
        className="min-h-0 flex-1 overflow-auto">
        {scope !== '' && (
          <div className="border-line text-text-muted sticky top-0 border-b bg-inherit px-3 py-1.5 font-mono text-xs">
            {scope}/
          </div>
        )}
        {loading && entries.length === 0 ? (
          <div className="text-text-muted px-3 py-2 text-xs">{t('workspace.mention_loading')}</div>
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
                i === activeIndex ? 'bg-selected' : 'hover:bg-hover',
              )}>
              {entry.isDirectory ? (
                <Folder className="text-text-muted size-3.5 shrink-0" aria-hidden />
              ) : (
                <FileIcon className="text-text-muted size-3.5 shrink-0" aria-hidden />
              )}
              <span className="text-text min-w-0 flex-1 truncate font-mono text-xs font-medium">
                {entry.name}
                {entry.isDirectory && '/'}
              </span>
              {entry.isDirectory && (
                <ChevronRight className="text-text-muted size-3.5 shrink-0" aria-hidden />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
