import type { AcpChatMessage } from '../../../hooks/acpSessionState';


export function shouldShowStreamingPlaceholder(message: AcpChatMessage): boolean {
  return !message.text && !!message.streaming;
}

export function shouldShowStreamingCaret(message: AcpChatMessage): boolean {
  return !!message.text && !!message.streaming;
}
