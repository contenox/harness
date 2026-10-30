import { ChatConnectionBadge } from './ChatConnectionBadge';
import { ChatPaneToggles } from './ChatPaneToggles';

/** Everything the chat page puts into the shared top-bar slot. */
export function ChatTopBarControls() {
  return (
    <span className="flex items-center gap-2">
      <ChatConnectionBadge />
      <ChatPaneToggles />
    </span>
  );
}
