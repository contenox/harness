import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cwdApiFetch } from '../lib/projectRuntime';
import { dropDirs, followWorkspaceEvents, treeChangeFor } from '../lib/workspaceEvents';
import type { WorkspaceFileRef } from '../pages/chat/lib/mentions';
import {
  flattenFiles,
  ROOT_DIR,
  type DirCache,
  type WorkspaceEntry,
} from '../pages/chat/lib/workspaceTree';
import { useEditorBuffers, type EditorApi, type FileVersion } from './useEditorBuffers';
import { useTreeExpansion, type TreeExpansionApi } from './useTreeExpansion';

export { HITL_POLICY_DEFAULT_VALUE } from '../lib/workspaceAccess';

interface FilesListEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  size: number;
}

interface FileContentResponse {
  path: string;
  content: string;
  contentBase64?: string;
  encoding: string;
  etag?: string;
}

export interface WorkspaceFilePeek {
  path: string;
  text: string;
  isBinary: boolean;
  etag: string;
}

export interface UseWorkspaceFilesResult {
  cache: DirCache;
  files: WorkspaceFileRef[];
  rootLoading: boolean;
  isLoading: (dir: string) => boolean;
  error: string | null;
  ensureLoaded: (dir: string) => void;
  refresh: () => void;
  reloadDir: (dir: string) => void;
  readFile: (path: string) => Promise<WorkspaceFilePeek>;
  agentView: boolean;
  setAgentView: (on: boolean) => void;
  hitlPolicyName?: string | null;
  editor: EditorApi;
  tree: TreeExpansionApi;
}

export function filesUrl(path: string, root: string): string {
  const params = new URLSearchParams({ path: path === ROOT_DIR ? '.' : path, root });
  return `/api/files?${params.toString()}`;
}

function contentUrl(path: string, root: string): string {
  const params = new URLSearchParams({ path, root });
  return `/api/files/content?${params.toString()}`;
}

export function useWorkspaceFiles(
  root: string | null,
  hitlPolicyName?: string | null,
): UseWorkspaceFilesResult {
  const [cache, setCache] = useState<DirCache>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [agentView, setAgentView] = useState(false);
  const rootRef = useRef(root);
  rootRef.current = root;
  const requestedRef = useRef<Set<string>>(new Set());
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const readFile = useCallback(
    async (path: string): Promise<WorkspaceFilePeek> => {
      if (!root) return { path, text: '', isBinary: false, etag: '' };
      const resp = await cwdApiFetch<FileContentResponse>(root, contentUrl(path, root));
      if (resp.encoding === 'base64') {
        return { path: resp.path, text: '', isBinary: true, etag: resp.etag ?? '' };
      }
      return { path: resp.path, text: resp.content ?? '', isBinary: false, etag: resp.etag ?? '' };
    },
    [root],
  );
  const readVersion = useCallback(
    async (path: string): Promise<FileVersion> => {
      const peek = await readFile(path);
      return { text: peek.text, etag: peek.etag, isBinary: peek.isBinary };
    },
    [readFile],
  );
  const editor = useEditorBuffers(root, readVersion);
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const load = useCallback(
    async (dir: string) => {
      if (!root) return;
      requestedRef.current.add(dir);
      setLoading(prev => ({ ...prev, [dir]: true }));
      try {
        const entries = await cwdApiFetch<FilesListEntry[]>(root, filesUrl(dir, root));
        if (rootRef.current !== root) return;
        const mapped: WorkspaceEntry[] = entries.map(e => ({
          path: e.path,
          name: e.name,
          isDirectory: e.isDirectory,
        }));
        setCache(prev => ({ ...prev, [dir]: mapped }));
        setError(null);
      } catch (err) {
        if (rootRef.current !== root) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (rootRef.current === root) setLoading(prev => ({ ...prev, [dir]: false }));
      }
    },
    [root],
  );

  useEffect(() => {
    requestedRef.current = new Set();
    setCache({});
    setLoading({});
    setError(null);
    if (root) void load(ROOT_DIR);
  }, [root, load]);

  const ensureLoaded = useCallback(
    (dir: string) => {
      if (requestedRef.current.has(dir)) return;
      void load(dir);
    },
    [load],
  );

  const tree = useTreeExpansion(root, cache, ensureLoaded);
  const treeRef = useRef(tree);
  treeRef.current = tree;

  useEffect(() => {
    if (!root) return;
    const controller = new AbortController();
    const due = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (dirs: Iterable<string>) => {
      for (const dir of dirs) due.add(dir);
      if (timer || due.size === 0) return;
      timer = setTimeout(() => {
        timer = null;
        const dirs = [...due];
        due.clear();
        for (const dir of dirs) {
          if (cacheRef.current[dir] !== undefined) void load(dir);
        }
      }, 150);
    };
    void followWorkspaceEvents({
      root,
      signal: controller.signal,
      onConnected: resumed => {
        if (resumed) schedule(Object.keys(cacheRef.current));
      },
      onEvent: event => {
        editorRef.current.handleEvent(event);
        treeRef.current.handleEvent(event);
        const change = treeChangeFor(event, cacheRef.current);
        if (!change) return;
        if (change.all) {
          schedule(Object.keys(cacheRef.current));
          return;
        }
        if (change.drop.length > 0) {
          for (const path of change.drop) {
            for (const key of [...requestedRef.current]) {
              if (key === path || key.startsWith(`${path}/`)) requestedRef.current.delete(key);
            }
          }
          setCache(prev => dropDirs(prev, change.drop));
        }
        schedule(change.reload);
      },
    });
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [root, load]);

  const reloadDir = useCallback(
    (dir: string) => {
      if (cacheRef.current[dir] !== undefined) void load(dir);
    },
    [load],
  );

  const refresh = useCallback(() => {
    requestedRef.current = new Set();
    setCache({});
    setLoading({});
    setError(null);
    if (root) void load(ROOT_DIR);
  }, [root, load]);

  const files = useMemo(() => flattenFiles(cache), [cache]);
  const isLoading = useCallback((dir: string) => !!loading[dir], [loading]);

  return {
    cache,
    files,
    rootLoading: !!loading[ROOT_DIR],
    isLoading,
    error,
    ensureLoaded,
    refresh,
    reloadDir,
    readFile,
    agentView,
    setAgentView,
    hitlPolicyName,
    editor,
    tree,
  };
}
