import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
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
import { clampIndex } from '../lib/slashMenu';
type DirCache = Record<string, MentionCandidate[] | undefined>;




const MAX_ENTRIES = 50;

export interface UseMentionMenuArgs {
  draft: string;
  /**
   * Current caret index in the composer textarea.
   */
  caret: number;
  /**
   * Per-directory listing cache from `useWorkspaceFiles` (root keyed by `''`).
   */
  cache: DirCache;
  /**
   * Lazily loads a directory's children when the menu browses into it.
   */
  ensureLoaded: (dir: string) => void;
  /**
   * Whether a directory's listing is still loading.
   */
  isLoading: (dir: string) => boolean;
  /**
   * Inserts a picked FILE as a mention: new draft, caret after the token, the file.
   */
  onInsert: (nextDraft: string, nextCaret: number, file: WorkspaceFileRef) => void;
  /**
   * Drills into a picked FOLDER: new draft (`@dir/`) and caret; the menu keeps browsing.
   */
  onDrill: (nextDraft: string, nextCaret: number) => void;
}

export interface UseMentionMenuResult {
  open: boolean;
  entries: MentionCandidate[];
  /**
   * The directory currently being browsed (root is `''`), shown as a breadcrumb.
   */
  scope: string;
  /**
   * True when the browsed directory's listing has not arrived yet.
   */
  loading: boolean;
  activeIndex: number;
  pick: (entry: MentionCandidate) => void;
  setActiveIndex: (i: number) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

const EMPTY_ENTRIES: MentionCandidate[] = [];

/**
 * Drives the composer's `@`-mention popover as a scoped file BROWSER: the `@query` is read as a path, split into a directory scope and a leaf filter (`lib/mentions.ts`).
 */
export function useMentionMenu({
  draft,
  caret,
  cache,
  ensureLoaded,
  isLoading,
  onInsert,
  onDrill,
}: UseMentionMenuArgs): UseMentionMenuResult {
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

  const filtered = useMemo(
    () => mentionCandidatesForScope(scopeEntries, leaf).slice(0, MAX_ENTRIES),
    [scopeEntries, leaf],
  );
  const loading = query.active && cache[scope] === undefined && isLoading(scope);




  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const open = query.active && dismissedFor !== draft && (filtered.length > 0 || loading);

  const [activeIndex, setActiveIndexState] = useState(0);
  useEffect(() => {
    setActiveIndexState(i => clampIndex(i, filtered.length));
  }, [filtered.length]);

  const setActiveIndex = useCallback(
    (index: number) => setActiveIndexState(clampIndex(index, filtered.length)),
    [filtered.length],
  );

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

  return {
    open,
    entries: filtered,
    scope,
    loading,
    activeIndex,
    pick,
    setActiveIndex,
    handleKeyDown,
  };
}
