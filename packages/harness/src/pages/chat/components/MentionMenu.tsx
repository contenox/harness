import { cn } from '@contenox/ui';
import { ChevronRight, File as FileIcon, Folder } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  applyMention,
  applyMentionAscend,
  applyMentionFolder,
  deriveMentionQuery,
  mentionCandidatesForScope,
  mentionMenuKeyFromEvent,
  splitMentionQuery,
  type MentionCandidate,
  type WorkspaceFileRef,
} from '../lib/mentions';
import type { DirCache } from '../lib/workspaceTree';
import type { FilePreviewState } from '../lib/filePreview';
import { clampIndex } from '../lib/slashMenuState';
import { MentionFilePreview } from './MentionFilePreview';

const MAX_ENTRIES = 50;

export interface UseMentionMenuArgs {
  draft: string;
  caret: number;
  cache: DirCache;
  ensureLoaded: (dir: string) => void;
  isLoading: (dir: string) => boolean;
  onInsert: (nextDraft: string, nextCaret: number, file: WorkspaceFileRef) => void;
  onDrill: (nextDraft: string, nextCaret: number) => void;
}

export interface UseMentionMenuResult {
  open: boolean;
  entries: MentionCandidate[];
  scope: string;
  loading: boolean;
  activeIndex: number;
  pick: (entry: MentionCandidate) => void;
  setActiveIndex: (i: number) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

const EMPTY_ENTRIES: MentionCandidate[] = [];

export function useMentionMenu({ draft, caret, cache, ensureLoaded, isLoading, onInsert, onDrill }: UseMentionMenuArgs): UseMentionMenuResult {
  const query = useMemo(() => deriveMentionQuery(draft, caret), [draft, caret]);
  const { dir: scope, leaf } = useMemo(() => splitMentionQuery(query.query), [query.query]);

  useEffect(() => {
    if (query.active) ensureLoaded(scope);
  }, [query.active, scope, ensureLoaded]);

  const scopeEntries = useMemo<MentionCandidate[]>(() => {
    const entries = cache[scope];
    if (!entries) return EMPTY_ENTRIES;
    return entries.map(e => ({ path: e.path, name: e.name, isDirectory: e.isDirectory }));
  }, [cache, scope]);

  const filtered = useMemo(() => mentionCandidatesForScope(scopeEntries, leaf).slice(0, MAX_ENTRIES), [scopeEntries, leaf]);
  const loading = query.active && cache[scope] === undefined && isLoading(scope);

  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const open = query.active && dismissedFor !== draft && (filtered.length > 0 || loading);

  const [activeIndex, setActiveIndexState] = useState(0);
  useEffect(() => {
    setActiveIndexState(i => clampIndex(i, filtered.length));
  }, [filtered.length]);

  const setActiveIndex = useCallback((index: number) => setActiveIndexState(clampIndex(index, filtered.length)), [filtered.length]);

  const pick = useCallback(
    (entry: MentionCandidate) => {
      const q = deriveMentionQuery(draft, caret);
      if (entry.isDirectory) {
        const { text, caret: nextCaret } = applyMentionFolder(draft, q, entry);
        onDrill(text, nextCaret);
        setActiveIndexState(0);
        setDismissedFor(null);
        return;
      }
      const { text, caret: nextCaret } = applyMention(draft, q, entry);
      onInsert(text, nextCaret, { path: entry.path, name: entry.name });
      setDismissedFor(null);
    },
    [draft, caret, onInsert, onDrill],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!open) return;
      const action = mentionMenuKeyFromEvent(e.key);
      if (!action) return;
      switch (action.type) {
        case 'move':
          e.preventDefault();
          setActiveIndexState(i => clampIndex(i + action.delta, filtered.length));
          break;
        case 'accept': {
          e.preventDefault();
          const entry = filtered[activeIndex];
          if (entry) pick(entry);
          break;
        }
        case 'drill': {
          const entry = filtered[activeIndex];
          if (entry?.isDirectory) {
            e.preventDefault();
            pick(entry);
          }
          break;
        }
        case 'ascend':
          if (scope !== '') {
            e.preventDefault();
            const { text, caret: nextCaret } = applyMentionAscend(draft, query);
            onDrill(text, nextCaret);
            setActiveIndexState(0);
          }
          break;
        case 'close':
          e.preventDefault();
          setDismissedFor(draft);
          break;
      }
    },
    [open, filtered, activeIndex, pick, draft, query, scope, onDrill],
  );

  return { open, entries: filtered, scope, loading, activeIndex, pick, setActiveIndex, handleKeyDown };
}

export interface MentionMenuProps {
  entries: MentionCandidate[];
  scope: string;
  loading: boolean;
  activeIndex: number;
  onPick: (entry: MentionCandidate) => void;
  onHoverIndex?: (index: number) => void;
  preview: FilePreviewState;
}

export function MentionMenu({ entries, scope, loading, activeIndex, onPick, onHoverIndex, preview }: MentionMenuProps) {
  const { t } = useTranslation();

  return (
    <div
      className="border-line bg-raised absolute bottom-full left-0 z-20 mb-2 flex max-h-[60vh] w-full min-h-0 flex-col overflow-hidden rounded-lg border shadow-lg sm:w-96"
    >
      <MentionFilePreview state={preview} />
      <div
        role="listbox"
        aria-label={t('workspace.mention_menu_label')}
        className="min-h-0 flex-1 overflow-auto"
      >
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
              )}
            >
              {entry.isDirectory ? (
                <Folder className="text-text-muted size-3.5 shrink-0" aria-hidden />
              ) : (
                <FileIcon className="text-text-muted size-3.5 shrink-0" aria-hidden />
              )}
              <span className="text-text min-w-0 flex-1 truncate font-mono text-xs font-medium">
                {entry.name}
                {entry.isDirectory && '/'}
              </span>
              {entry.isDirectory && <ChevronRight className="text-text-muted size-3.5 shrink-0" aria-hidden />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
