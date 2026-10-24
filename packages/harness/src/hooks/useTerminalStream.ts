import { useMemo } from 'react';
import { useAcpWorkspace } from './useAcpWorkspace';
import { EMPTY_SESSION_KEY } from './acpWorkspaceState';
import { splitTerminalLines } from '../pages/chat/lib/terminalPassthrough';

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
