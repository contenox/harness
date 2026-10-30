import {
  ChatMessage,
  ChatStreamThinkingBox,
  ChatStreamingCaret,
  ChatThread,
  chatTranscriptMarkdownComponents,
  useChatScroll,
} from '../../../components/chat';
import { Span } from '../../../components/Typography';
import { InlineAttachments, type InlineAttachment } from '../../../components/InlineAttachmentRenderer';
import { InlineNotice } from '../../../components/InlineNotice';
import { ToolCallCard, type ToolCallStatus as CardStatus } from '../../../components/ToolCallCard';
import { ImageOff, VolumeX } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {
  AcpChatMessage,
  AcpSessionState,
  AcpToolCallState,
} from '../state/acpSessionState';
import { DROPPED_KIND_AUDIO, DROPPED_KIND_IMAGE } from '../lib/droppedContent';
import { toolCallError } from '../lib/toolCallError';
import type { ImagePart, ToolCallStatus } from '@contenox/acp-client';

export function Transcript({ session }: { session: AcpSessionState }) {
  const { containerRef, endRef } = useChatScroll({
    deps: [session.items.length, session.messages],
  });

  return (
    <ChatThread containerRef={containerRef} endRef={endRef} scrollClassName="space-y-4 p-3 sm:p-6">
      {session.items.map((item, index) => {
        const isLatest = index === session.items.length - 1;
        switch (item.kind) {
          case 'message': {
            const message = session.messages[item.id];
            return message ? (
              <MessageItem key={item.id} message={message} isLatest={isLatest} />
            ) : null;
          }
          case 'tool_call': {
            const call = session.toolCalls[item.id];
            return call ? <ToolCallItem key={item.id} call={call} /> : null;
          }
          case 'terminal': {
            const card = session.terminals[item.id];
            return card ? (
              <ToolCallCard
                key={item.id}
                tool="shell"
                title={card.command}
                status="success"
                detail={<pre className="overflow-x-auto font-mono text-xs">{card.output}</pre>}
              />
            ) : null;
          }
          case 'error': {
            const card = session.errorCards[item.id];
            return card ? (
              <InlineNotice key={item.id} variant="error" role="alert">
                {card.message}
              </InlineNotice>
            ) : null;
          }
        }
      })}
    </ChatThread>
  );
}


function MessageItem({ message, isLatest }: { message: AcpChatMessage; isLatest: boolean }) {
  return (
    <ChatMessage
      role={message.role}
      roleLabel={message.role === 'user' ? 'You' : 'Agent'}
      appearance="transcript"
      collapsible={false}
      isLatest={isLatest}
      copyText={message.text || undefined}>
      {message.thinking && (
        <ChatStreamThinkingBox className="mb-2">
          {message.thinking}
          {message.thinkingStreaming && <ChatStreamingCaret />}
        </ChatStreamThinkingBox>
      )}
      {message.text !== '' && (
        <div className="prose prose-compact dark:prose-invert max-w-none text-sm break-words">
          <Markdown remarkPlugins={[remarkGfm]} components={chatTranscriptMarkdownComponents}>
            {message.text}
          </Markdown>
        </div>
      )}
      <MessageImages message={message} />
      <MessageAudio message={message} />
      {message.streaming && <ChatStreamingCaret />}
    </ChatMessage>
  );
}


function inlineImage(image: ImagePart, index: number, total: number): InlineAttachment {
  return {
    kind: 'image',
    data: image.data,
    mimeType: image.mimeType,
    alt: total === 1 ? 'Attached image' : `Attached image ${index + 1} of ${total}`,
  };
}


function MessageImages({ message }: { message: AcpChatMessage }) {
  const images = message.images ?? [];
  if (images.length === 0) return null;
  const dropped = message.droppedContent?.includes(DROPPED_KIND_IMAGE) === true;
  return (

    <div className="not-prose">
      <InlineAttachments
        attachments={images.map((image, index) => inlineImage(image, index, images.length))}
      />

      {dropped && (
        <p className="text-warning-700 dark:text-dark-warning-700 mt-1.5 flex items-start gap-1.5">
          <ImageOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <Span className="text-warning-700 dark:text-dark-warning-700 text-xs">
            {images.length === 1
              ? 'The machine could not pass this picture to the model — it answered without seeing it.'
              : 'The machine could not pass these pictures to the model — it answered without seeing them.'}
          </Span>
        </p>
      )}
    </div>
  );
}






function MessageAudio({ message }: { message: AcpChatMessage }) {
  const clips = message.audio ?? [];
  if (clips.length === 0) return null;
  const dropped = message.droppedContent?.includes(DROPPED_KIND_AUDIO) === true;
  return (

    <div className="not-prose flex flex-col gap-1.5">
      {clips.map((clip, index) => (
        <audio
          key={index}
          controls
          preload="metadata"
          src={`data:${clip.mimeType};base64,${clip.data}`}
          className="h-10 w-full max-w-xs"
          aria-label={
            clips.length === 1 ? 'Attached audio' : `Attached audio ${index + 1} of ${clips.length}`
          }
        />
      ))}

      {dropped && (
        <p className="text-warning-700 dark:text-dark-warning-700 mt-0 flex items-start gap-1.5">
          <VolumeX className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <Span className="text-warning-700 dark:text-dark-warning-700 text-xs">
            {clips.length === 1
              ? 'The machine could not pass this audio to the model — it answered without hearing it.'
              : 'The machine could not pass these clips to the model — it answered without hearing them.'}
          </Span>
        </p>
      )}
    </div>
  );
}


const CARD_STATUS: Record<ToolCallStatus, CardStatus> = {
  pending: 'pending',
  in_progress: 'running',
  completed: 'success',
  failed: 'error',
};

function ToolCallItem({ call }: { call: AcpToolCallState }) {
  const errorText = toolCallError(call);
  const detail =
    errorText != null || call.rawOutput != null ? (
      <ToolCallDetail errorText={errorText} rawOutput={call.rawOutput} />
    ) : undefined;
  return (
    <ToolCallCard
      tool={call.kind ?? 'tool'}
      title={call.title ?? call.toolCallId}
      status={call.status ? CARD_STATUS[call.status] : 'pending'}
      detail={detail}
    />
  );
}

function ToolCallDetail({ errorText, rawOutput }: { errorText: string | null; rawOutput?: unknown }) {
  return (
    <div className="space-y-2">
      {errorText != null && <InlineNotice variant="error">{errorText}</InlineNotice>}
      {rawOutput != null && <RawDetail value={rawOutput} />}
    </div>
  );
}


function RawDetail({ value }: { value: unknown }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap">{text}</pre>;
}
