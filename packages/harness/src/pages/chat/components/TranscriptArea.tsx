import { ChatScrollToLatest, ChatThread, EmptyState, useChatScroll } from '@contenox/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AcpSessionState } from '../../../hooks/acpSessionState';
import { TranscriptItems } from './TranscriptItems';

export interface TranscriptAreaProps {
  session: AcpSessionState;
  agentName: string | null;
  /** Agent staged for a new chat, shown in the empty-state copy. */
  stagedAgent: string | null;
  onRespondPermission: (optionId: string) => void;
  onOpenFile: (path: string) => void;
}

/** The scrolling timeline, or the "what should we build?" start screen while the chat is empty. */
export const TranscriptArea = memo(function TranscriptArea({
  session,
  agentName,
  stagedAgent,
  onRespondPermission,
  onOpenFile,
}: TranscriptAreaProps) {
  const { t } = useTranslation();
  const { containerRef, endRef, isNearBottom, scrollToEnd } = useChatScroll({
    deps: [session.items, session.pendingPermission],
  });

  if (session.items.length === 0 && !session.pendingPermission) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyState
          size="hero"
          title={t('acp_chat.empty_title')}
          description={
            stagedAgent ? t('acp_chat.empty_description_agent', { name: stagedAgent }) : t('acp_chat.empty_description')
          }
          className="pb-6"
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ChatThread containerRef={containerRef} endRef={endRef}>
        <TranscriptItems
          session={session}
          agentName={agentName}
          onRespondPermission={onRespondPermission}
          onOpenFile={onOpenFile}
        />
      </ChatThread>
      <ChatScrollToLatest visible={!isNearBottom} onClick={scrollToEnd} label={t('acp_chat.scroll_to_latest')} />
    </div>
  );
});
