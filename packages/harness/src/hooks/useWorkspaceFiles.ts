import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/fetch';
import {
  flattenFiles,
  ROOT_DIR,
  type DirCache,
  type WorkspaceEntry,
} from '../pages/chat/lib/workspaceTree';
import type { WorkspaceFileRef } from '../pages/chat/lib/mentions';

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
}

export interface WorkspaceFilePeek {
  path: string;
  text: string;
  isBinary: boolean;
}

export interface UseWorkspaceFilesResult {
  cache: DirCache;
  files: WorkspaceFileRef[];
  rootLoading: boolean;
  isLoading: (dir: string) => boolean;
  error: string | null;
  ensureLoaded: (dir: string) => void;
  refresh: () => void;
  readFile: (path: string) => Promise<WorkspaceFilePeek>;
  agentView: boolean;
  setAgentView: (on: boolean) => void;
  hitlPolicyName?: string | null;
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

  const load = useCallback(
    async (dir: string) => {
      if (!root) return;
      requestedRef.current.add(dir);
      setLoading(prev => ({ ...prev, [dir]: true }));
      try {
        const entries = await apiFetch<FilesListEntry[]>(filesUrl(dir, root));
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

  const refresh = useCallback(() => {
    requestedRef.current = new Set();
    setCache({});
    setLoading({});
    setError(null);
    if (root) void load(ROOT_DIR);
  }, [root, load]);

  const readFile = useCallback(
    async (path: string): Promise<WorkspaceFilePeek> => {
      if (!root) return { path, text: '', isBinary: false };
      const resp = await apiFetch<FileContentResponse>(contentUrl(path, root));
      if (resp.encoding === 'base64') {
        return { path: resp.path, text: '', isBinary: true };
      }
      return { path: resp.path, text: resp.content ?? '', isBinary: false };
    },
    [root],
  );

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
    readFile,
    agentView,
    setAgentView,
    hitlPolicyName,
  };
}
