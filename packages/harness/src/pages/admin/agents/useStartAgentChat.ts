import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startNewChat } from '../../../components/sidebar/newChatIntent';
import { useAcpWorkspace } from '../../../hooks/useAcpWorkspace';
import { useStagedAgent } from '../../../lib/stagedAgent';
import { useStagedRoot } from '../../../lib/stagedRoot';

export function useStartAgentChat() {
  const navigate = useNavigate();
  const { focusEmptyTab } = useAcpWorkspace();
  const { setStagedAgent } = useStagedAgent();
  const { setStagedRoot } = useStagedRoot();
  return useCallback(
    (agent: string) =>
      startNewChat(agent, {
        setStagedAgent,
        setStagedRoot,
        focusEmptyTab,
        navigate,
        closeSidebar: () => {},
      }),
    [setStagedAgent, setStagedRoot, focusEmptyTab, navigate],
  );
}
