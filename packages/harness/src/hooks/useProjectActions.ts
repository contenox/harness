import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startNewChat } from '../components/sidebar/newChatIntent';
import { api } from '../lib/api';
import {
  ensureProjectPrefix,
  hasProjectBridge,
  invalidateKnownRoots,
  normalizeProjectPath,
} from '../lib/projectRuntime';
import { workspaceRootKeys } from '../lib/queryKeys';
import { useStagedAgent } from '../lib/stagedAgent';
import { useStagedRoot } from '../lib/stagedRoot';
import { projectName } from '../lib/workspaceRoots';
import { folderBasename } from '../components/workspace/folderTree';
import { useAcpWorkspace } from './useAcpWorkspace';
import { useAddWorkspaceRoot } from './useWorkspaceRootMutations';

function samePath(a: string, b: string): boolean {
  return normalizeProjectPath(a) === normalizeProjectPath(b);
}

/** Project-level actions shared by the sidebar, the New Project dialog and the launch-folder handler. */
export function useProjectActions(closeSidebar: () => void = () => {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { focusEmptyTab } = useAcpWorkspace();
  const { setStagedAgent } = useStagedAgent();
  const { setStagedRoot } = useStagedRoot();
  const addRoot = useAddWorkspaceRoot();

  /** Opens an empty chat whose first prompt creates the session inside `path`. */
  const openSessionIn = useCallback(
    (path: string, agent: string | null = null) =>
      startNewChat(
        agent,
        { setStagedAgent, setStagedRoot, focusEmptyTab, navigate, closeSidebar },
        { cwd: path },
      ),
    [setStagedAgent, setStagedRoot, focusEmptyTab, navigate, closeSidebar],
  );

  /**
   * Registers `path` as a project on the default runtime, starts its own runtime (desktop),
   * then opens a staged session in it. Rejects with the API error when the grant is refused.
   */
  const createProject = useCallback(
    async (path: string, name: string) => {
      const trimmed = path.trim();
      await addRoot.mutateAsync({ path: trimmed, name: name.trim() });
      if (hasProjectBridge()) await ensureProjectPrefix(trimmed);
      openSessionIn(trimmed);
    },
    [addRoot, openSessionIn],
  );

  /** Folder handed to the app at launch: register it if new, then open a session in it. */
  const openFolder = useCallback(
    async (folder: string) => {
      let roots = (await api.getWorkspaceRoots().catch(() => ({ roots: [] }))).roots ?? [];
      let existing = roots.find(r => samePath(r.path, folder));
      if (!existing) {
        const resp = await api.addWorkspaceRoot({ path: folder, name: folderBasename(folder) });
        invalidateKnownRoots();
        await queryClient.invalidateQueries({ queryKey: workspaceRootKeys.all });
        roots = resp.roots ?? [];
        existing = roots.find(r => samePath(r.path, folder));
      }
      const path = existing?.path ?? folder;
      if (hasProjectBridge() && !existing?.default) await ensureProjectPrefix(path);
      openSessionIn(path);
      return existing ? projectName(existing) : folderBasename(folder);
    },
    [queryClient, openSessionIn],
  );

  return { openSessionIn, createProject, openFolder, creating: addRoot.isPending };
}
