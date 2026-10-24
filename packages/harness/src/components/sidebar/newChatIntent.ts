export interface NewChatDeps {
  setStagedAgent: (name: string | null) => void;
  setStagedRoot?: (cwd: string | null) => void;
  focusEmptyTab: () => void;
  navigate: (to: string) => void;
  closeSidebar: () => void;
}

export interface NewChatOptions {
  cwd?: string | null;
}

export function startNewChat(
  agent: string | null,
  deps: NewChatDeps,
  opts?: NewChatOptions,
): void {
  deps.setStagedAgent(agent);
  deps.setStagedRoot?.(opts?.cwd ?? null);
  deps.focusEmptyTab();
  deps.navigate('/chat');
  deps.closeSidebar();
}
