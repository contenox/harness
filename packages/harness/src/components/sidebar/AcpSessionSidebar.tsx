import { useCallback, useMemo, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { useAcpWorkspace } from '../../hooks/useAcpWorkspace';
import { useProjectActions } from '../../hooks/useProjectActions';
import { useWorkspaceRoots } from '../../hooks/useWorkspaceRoots';
import { useStagedAgent } from '../../lib/stagedAgent';
import { useStagedRoot } from '../../lib/stagedRoot';
import type { WorkspaceRoot } from '../../lib/types';
import { NewProjectDialog } from '../workspace/NewProjectDialog';
import { RenameProjectDialog } from '../workspace/RenameProjectDialog';
import { useCollapsedGroups } from './collapsedGroups';
import { startNewChat } from './newChatIntent';
import { NewSessionButton } from './NewSessionButton';
import { ProjectsSection } from './ProjectsSection';
import { groupSessionsByProject } from './sessionGroups';
import { SidebarFooterNav } from './SidebarFooterNav';
import { useSessionSidebarActions } from './useSessionSidebarActions';

function closeOnMobile(setIsOpen: (open: boolean) => void): void {
  if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 640px)').matches) {
    setIsOpen(false);
  }
}

/** Sidebar container: wires workspace data and actions into the presentational pieces. */
export function AcpSessionSidebar({ setIsOpen }: { setIsOpen: (open: boolean) => void }) {
  const navigate = useNavigate();
  const activeSessionId = useMatch('/chat/:sessionId')?.params.sessionId;
  const { workspace, sessions, focusEmptyTab } = useAcpWorkspace();
  const { roots } = useWorkspaceRoots();
  const { setStagedAgent } = useStagedAgent();
  const { setStagedRoot } = useStagedRoot();
  const groupsState = useCollapsedGroups();
  const actions = useSessionSidebarActions(activeSessionId);

  const closeSidebar = useCallback(() => closeOnMobile(setIsOpen), [setIsOpen]);
  const { openSessionIn } = useProjectActions(closeSidebar);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [renaming, setRenaming] = useState<WorkspaceRoot | null>(null);

  const startNew = useCallback(
    (agent: string | null) =>
      startNewChat(agent, { setStagedAgent, setStagedRoot, focusEmptyTab, navigate, closeSidebar }),
    [setStagedAgent, setStagedRoot, focusEmptyTab, navigate, closeSidebar],
  );

  const groups = useMemo(
    () => groupSessionsByProject(workspace.sessions, roots),
    [workspace.sessions, roots],
  );

  return (
    <>
      <NewSessionButton onStart={startNew} />
      <ProjectsSection
        groups={groups}
        loading={workspace.status === 'connecting' && workspace.sessions.length === 0}
        activeSessionId={activeSessionId}
        pendingPermission={id => sessions.slices[id]?.pendingPermission != null}
        isGroupOpen={groupsState.isOpen}
        onToggleGroup={groupsState.toggle}
        onNavigate={closeSidebar}
        onDeleteSession={actions.confirmDeleteSession}
        onNewProject={() => setNewProjectOpen(true)}
        onNewSessionIn={openSessionIn}
        onRenameProject={setRenaming}
        onRemoveProject={actions.confirmRemoveProject}
        removeFailed={actions.removeProjectFailed}
      />
      <SidebarFooterNav onNavigate={closeSidebar} />

      <NewProjectDialog
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        closeSidebar={closeSidebar}
      />
      <RenameProjectDialog root={renaming} onClose={() => setRenaming(null)} />
    </>
  );
}
