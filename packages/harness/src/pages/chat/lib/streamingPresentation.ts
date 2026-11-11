import type { AcpChatMessage, AcpSessionState } from '../../../hooks/acpSessionState';

export function shouldShowStreamingPlaceholder(message: AcpChatMessage): boolean {
  return !message.text && !!message.streaming;
}

export function shouldShowStreamingCaret(message: AcpChatMessage): boolean {
  return !!message.text && !!message.streaming;
}

export function shouldShowWaitingForModel(session: AcpSessionState): boolean {
  if (!session.isPrompting || session.pendingPermission) return false;
  if (session.activeTurnMessageId !== null) return false;
  return !Object.values(session.toolCalls).some(
    call => call.status === 'pending' || call.status === 'in_progress',
  );
}
