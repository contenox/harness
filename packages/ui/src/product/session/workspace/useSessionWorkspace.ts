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

export interface CaretTextareaProps {
  onSelect: (e: ReactSyntheticEvent<HTMLTextAreaElement>) => void;
  onKeyUp: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onClick: (e: ReactMouseEvent<HTMLTextAreaElement>) => void;
  onInput: (e: ReactFormEvent<HTMLTextAreaElement>) => void;
}

export interface SessionWorkspace {
  canvas: UseFileCanvasResult;
  files: SessionWorkspaceFiles;
  mentionMenu: UseMentionMenuResult;
  caretProps: CaretTextareaProps;
  mentionsIn: (text: string) => WorkspaceFileRef[];
  afterSend: () => void;
  askAboutSelection: (path: string, region: SelectedRegion) => void;
  listDir: (dir: string) => Promise<{ path: string; name: string; isDirectory: boolean }[]>;
  saveFile: (path: string, content: string) => Promise<void>;
}

export interface SessionWorkspaceFiles {
  cache: DirCache;
  isLoading: (dir: string) => boolean;
  error?: string | null;
  ensureLoaded: (dir: string) => void;
  refresh?: () => void;
  reload?: (dirs: readonly string[]) => void;
  reloadLoaded?: () => void;
}

export interface SessionWorkspaceSource {
  listWorkspace: (path?: string) => Promise<WorkspaceListing>;
  readFile: (path: string) => Promise<{ content: string; isDir: boolean }>;
  readFileRaw: (path: string) => Promise<{ content: string; isDir: boolean }>;
  writeFile: (path: string, content: string) => Promise<void>;
  files: SessionWorkspaceFiles;
}

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
