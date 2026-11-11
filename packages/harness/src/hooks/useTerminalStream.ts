import { useMemo } from 'react';
import { splitTerminalLines } from '../pages/chat/lib/terminalPassthrough';
import { EMPTY_SESSION_KEY } from './acpWorkspaceState';
import { useAcpWorkspace } from './useAcpWorkspace';

export interface TerminalStream {
  lines: string[];
  hasOutput: boolean;
}

export function useTerminalStream(sessionId: string | null): TerminalStream {
  const { sessions } = useAcpWorkspace();
  const text = sessions.slices[sessionId ?? EMPTY_SESSION_KEY]?.terminal?.text ?? '';
  const lines = useMemo(() => splitTerminalLines(text), [text]);
  return { lines, hasOutput: text.length > 0 };
}
