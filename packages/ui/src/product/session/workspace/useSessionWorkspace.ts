import {
  useCallback,
  useState,
  type Dispatch,
  type FormEvent as ReactFormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
  type SyntheticEvent as ReactSyntheticEvent,
} from 'react';
import type { WorkspaceListing } from '@contenox/acp-client';
import { useMentionMenu, type UseMentionMenuResult } from '../hooks/useMentionMenu';
import { activeMentions, type WorkspaceFileRef } from '../lib/mentions';
import type { DirCache } from '../lib/workspaceTree';
import { useFileCanvas, type UseFileCanvasResult } from './fileCanvasState';
import type { SelectedRegion } from './monacoViewShared';
import { makeQuote, selectionBlockText } from './selectionQuote';

/** The composer events that move the caret; spread into the textarea's props. */
export interface CaretTextareaProps {
  onSelect: (e: ReactSyntheticEvent<HTMLTextAreaElement>) => void;
  onKeyUp: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onClick: (e: ReactMouseEvent<HTMLTextAreaElement>) => void;
  onInput: (e: ReactFormEvent<HTMLTextAreaElement>) => void;
}

/** Everything a session screen needs to show the workspace beside its conversation and to mention its files. */
export interface SessionWorkspace {
  canvas: UseFileCanvasResult;
  files: SessionWorkspaceFiles;
  mentionMenu: UseMentionMenuResult;
  /** Keeps the caret current; an `@` is a mention only where the caret is. */
  caretProps: CaretTextareaProps;
  /** The picked mentions whose token is still in `text`. */
  mentionsIn: (text: string) => WorkspaceFileRef[];
  /** Forgets the picked mentions and the caret after a prompt is sent. */
  afterSend: () => void;
  /** Appends a file selection to the draft and returns to the conversation. */
  askAboutSelection: (path: string, region: SelectedRegion) => void;
  /** Reads one directory of the session's workspace, for the tree's quick-find. */
  listDir: (dir: string) => Promise<{ path: string; name: string; isDirectory: boolean }[]>;
  /** Persists an edited file and updates its open tab. */
  saveFile: (path: string, content: string) => Promise<void>;
}

/**
 * The per-directory listing cache the composer's `@` picker and the tree share.
 * Its owner is the app, because it is fed by the app's workspace-files hook.
 */
export interface SessionWorkspaceFiles {
  cache: DirCache;
  isLoading: (dir: string) => boolean;
  error?: string | null;
  ensureLoaded: (dir: string) => void;
  refresh?: () => void;
  reload?: (dirs: readonly string[]) => void;
  reloadLoaded?: () => void;
}

/**
 * What the app hands the workbench: the ACP file extension of the attached
 * session, plus the listing cache. The library does not import the app's
 * workspace hooks; it renders and drives them through this seam.
 */
export interface SessionWorkspaceSource {
  listWorkspace: (path?: string) => Promise<WorkspaceListing>;
  readFile: (path: string) => Promise<{ content: string; isDir: boolean }>;
  readFileRaw: (path: string) => Promise<{ content: string; isDir: boolean }>;
  writeFile: (path: string, content: string) => Promise<void>;
  files: SessionWorkspaceFiles;
}

/**
 * The workspace half of a session screen: the file canvas, the per-directory
 * listing cache, and the composer's `@` mention state, all over the ACP file
 * extension the attached session serves.
 *
 * The draft belongs to the screen; this reads it and writes it only to insert
 * a mention or a selection quote.
 */
export function useSessionWorkspace(
  source: SessionWorkspaceSource,
  draft: string,
  setDraft: Dispatch<SetStateAction<string>>,
): SessionWorkspace {
  const { listWorkspace, readFile, readFileRaw, writeFile, files } = source;
  const [caret, setCaret] = useState(0);
  const [mentions, setMentions] = useState<WorkspaceFileRef[]>([]);
  const mentionMenu = useMentionMenu({
    draft,
    caret,
    cache: files.cache,
    ensureLoaded: files.ensureLoaded,
    isLoading: files.isLoading,
    onInsert: (nextDraft, nextCaret, file) => {
      setDraft(nextDraft);
      setCaret(nextCaret);
      setMentions(prev => (prev.some(m => m.path === file.path) ? prev : [...prev, file]));
    },
    onDrill: (nextDraft, nextCaret) => {
      setDraft(nextDraft);
      setCaret(nextCaret);
    },
  });
  const canvas = useFileCanvas({ readFile, readFileRaw });

  const askAboutSelection = useCallback(
    (path: string, region: SelectedRegion) => {
      if (!region.text.trim()) return;
      const block = selectionBlockText(makeQuote(path, region.startLine, region.endLine, region.text));
      setDraft(d => (d ? `${d}\n\n${block}` : block));
      canvas.activate('');
    },
    [canvas, setDraft],
  );

  const listDir = useCallback(
    async (dir: string) => {
      const listing = await listWorkspace(dir === '' ? '.' : dir);
      return listing.entries.map(e => ({ path: e.path, name: e.name, isDirectory: e.isDir }));
    },
    [listWorkspace],
  );

  const saveFile = useCallback(
    async (path: string, content: string) => {
      await writeFile(path, content);
      canvas.updateFileContent(path, content);
    },
    [writeFile, canvas],
  );

  const caretProps: CaretTextareaProps = {
    onSelect: e => setCaret(e.currentTarget.selectionStart),
    onKeyUp: e => setCaret(e.currentTarget.selectionStart),
    onClick: e => setCaret(e.currentTarget.selectionStart),
    onInput: e => setCaret(e.currentTarget.selectionStart),
  };

  return {
    canvas,
    files,
    mentionMenu,
    caretProps,
    mentionsIn: text => activeMentions(text, mentions),
    afterSend: () => {
      setMentions([]);
      setCaret(0);
    },
    askAboutSelection,
    listDir,
    saveFile,
  };
}
