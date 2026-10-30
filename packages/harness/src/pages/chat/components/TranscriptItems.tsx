import {
  Button,
  ChatMessage,
  ChatStreamingCaret,
  ChatStreamThinkingBox,
  chatTranscriptMarkdownComponents,
  ChatTranscriptStreamingPlaceholder,
  cn,
  Collapsible,
  diffLinesFromTexts,
  DiffView,
  InlineAttachments,
  InlineNotice,
  stripAnsi,
  TerminalOutput,
  tailLines,
  TOOL_CALL_PREVIEW_LINES,
  ToolCallCard,
  type ToolCallCardProps,
} from '@contenox/ui';
import { toolCallError } from '@contenox/ui/session-lib';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {
  AcpChatMessage,
  AcpErrorCard,
  AcpSessionState,
  AcpTerminalCard,
  AcpTimelineItem,
  AcpToolCallState,
} from '../../../hooks/acpSessionState';
import { shellCommandLine, shellOutputLines } from '../../../lib/shellExecution';
import {
  shouldShowStreamingCaret,
  shouldShowStreamingPlaceholder,
} from '../lib/streamingPresentation';
import { ChatErrorCard } from './ChatErrorCard';
import { MissionAskCard } from './MissionAskCard';
import { PermissionCard } from './PermissionCard';

function toolCallCardStatus(
  status?: AcpToolCallState['status'],
): NonNullable<ToolCallCardProps['status']> {
  switch (status) {
    case 'in_progress':
      return 'running';
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'pending':
    default:
      return 'pending';
  }
}

function LogTail({ lines }: { lines: string[] }) {
  return (
    <pre className="whitespace-pre-wrap break-all">
      {tailLines(lines.map(stripAnsi), TOOL_CALL_PREVIEW_LINES).join('\n')}
    </pre>
  );
}

function toolCallContentText(toolCall: AcpToolCallState): string {
  return (toolCall.content ?? [])
    .map(c => (c.type === 'content' && typeof c.content?.text === 'string' ? c.content.text : ''))
    .filter(Boolean)
    .join('\n');
}

/** Collapsed-card log tail; derived from state on every render so streamed chunks update it. */
function toolCallPreview(toolCall: AcpToolCallState): ReactNode {
  const running = toolCall.status === 'in_progress' || toolCall.status === 'pending';
  const streamed = toolCallContentText(toolCall);
  let lines: string[] = [];
  if (toolCall.kind === 'execute') {
    lines = running ? tailLines(streamed, TOOL_CALL_PREVIEW_LINES) : (shellOutputLines(toolCall.rawOutput) ?? tailLines(streamed, TOOL_CALL_PREVIEW_LINES));
  } else {
    lines = tailLines(streamed, TOOL_CALL_PREVIEW_LINES);
  }
  if (tailLines(lines, 1).length === 0) {
    const summary =
      shellCommandLine(toolCall.rawInput) ??
      (toolCall.locations?.[0]?.path
        ? `${toolCall.locations[0].path}${toolCall.locations[0].line ? `:${toolCall.locations[0].line}` : ''}`
        : null);
    if (!summary) return undefined;
    lines = [summary];
  }
  return <LogTail lines={lines} />;
}

function diffKey(path: string | undefined, indexOfKind: number): string {
  return `diff-${path ?? 'unnamed'}-${indexOfKind}`;
}

function locationKey(
  path: string | undefined,
  line: number | undefined,
  indexOfKind: number,
): string {
  return `loc-${path ?? 'unnamed'}-${line ?? ''}-${indexOfKind}`;
}

function ThinkingHeader({ streaming }: { streaming: boolean | undefined }) {
  const { t } = useTranslation();
  return (
    <span className={cn('inline-flex items-center gap-1.5', streaming && 'animate-pulse')}>
      <span>
        {streaming ? t('acp_chat.thinking_streaming_label') : t('acp_chat.thinking_done_label')}
      </span>
    </span>
  );
}

const TranscriptMessage = memo(function TranscriptMessage({
  message,
  agentName,
  isLatest,
}: {
  message: AcpChatMessage;
  agentName: string | null;
  isLatest: boolean;
}) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const roleLabel = isUser ? t('acp_chat.role_user') : (agentName ?? t('acp_chat.role_agent'));
  const showRoleLabel = !isUser && !!agentName && !/contenox/i.test(agentName);

  return (
    <ChatMessage
      role={message.role}
      roleLabel={roleLabel}
      appearance="plain"
      showRoleLabel={showRoleLabel}
      isLatest={isLatest}
      collapsible={false}
      copyText={message.text || undefined}
      copyLabel={t('acp_chat.copy')}
      copiedLabel={t('acp_chat.copied')}>
      {message.thinking && (
        <Collapsible
          defaultOpen={false}
          title={<ThinkingHeader streaming={message.thinkingStreaming} />}
          className="mb-2">
          <ChatStreamThinkingBox className="mt-1">{message.thinking}</ChatStreamThinkingBox>
        </Collapsible>
      )}
      {message.text ? (
        <>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatTranscriptMarkdownComponents}>
            {message.text}
          </ReactMarkdown>
          {shouldShowStreamingCaret(message) && <ChatStreamingCaret />}
        </>
      ) : shouldShowStreamingPlaceholder(message) ? (
        <ChatTranscriptStreamingPlaceholder>
          {t('acp_chat.typing_label')}
        </ChatTranscriptStreamingPlaceholder>
      ) : null}

      {message.missionAsk && (
        <MissionAskCard key={message.missionAsk.askId} ask={message.missionAsk} />
      )}
      {message.images && message.images.length > 0 && (
        <InlineAttachments
          attachments={message.images.map(img => ({
            kind: 'image' as const,
            data: img.data,
            mimeType: img.mimeType,
          }))}
          labels={{
            imageAttachment: t('acp_chat.image_attachment_alt'),
            expandImage: t('acp_chat.image_expand'),
            closeImage: t('acp_chat.image_dialog_close'),
          }}
        />
      )}
    </ChatMessage>
  );
});

function ToolCallDetail({ toolCall, onOpenFile }: { toolCall: AcpToolCallState; onOpenFile?: (path: string) => void }) {
  const { t } = useTranslation();
  const diffs = (toolCall.content ?? []).filter(c => c.type === 'diff');
  const other = (toolCall.content ?? []).filter(c => c.type !== 'diff');
  const hasRaw = toolCall.rawInput != null || toolCall.rawOutput != null || other.length > 0;
  const errorText = toolCallError(toolCall);

  const errorNotice = errorText ? (
    <InlineNotice variant="error">
      <span className="font-medium">{t('acp_chat.tool_error_label')}</span>
      {'\n'}
      {errorText}
    </InlineNotice>
  ) : null;

  const shellLines =
    toolCall.kind === 'execute' && other.length === 0 ? shellOutputLines(toolCall.rawOutput) : null;
  if (shellLines) {
    const commandLine = shellCommandLine(toolCall.rawInput);
    return (
      <div className="space-y-3">
        {errorNotice}
        <TerminalOutput
          lines={commandLine ? [commandLine, ...shellLines] : shellLines}
          maxHeight="15rem"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errorNotice}
      {diffs.map((d, i) => (
        <DiffView
          key={diffKey(d.path, i)}
          filePath={d.path ?? ''}
          lines={diffLinesFromTexts(d.oldText ?? '', d.newText ?? '')}
        />
      ))}
      {toolCall.locations && toolCall.locations.length > 0 && (
        <ul className="text-text-muted space-y-0.5">
          {toolCall.locations.map((loc, i) => (
            <li key={locationKey(loc.path, loc.line, i)} className="break-all">
              {onOpenFile && loc.path ? (
                <Button type="button" variant="text" size="xs" onClick={() => onOpenFile(loc.path!)}>
                  {loc.path}
                  {loc.line ? `:${loc.line}` : ''}
                </Button>
              ) : (
                <>
                  {loc.path}
                  {loc.line ? `:${loc.line}` : ''}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasRaw && (
        <Collapsible title={t('acp_chat.tool_raw_output')}>
          <pre className="mt-2 max-h-60 overflow-auto break-all whitespace-pre-wrap">
            {JSON.stringify(
              { input: toolCall.rawInput, output: toolCall.rawOutput, content: other },
              null,
              2,
            )}
          </pre>
        </Collapsible>
      )}
    </div>
  );
}

const TranscriptToolCall = memo(function TranscriptToolCall({
  toolCall,
  onOpenFile,
}: {
  toolCall: AcpToolCallState;
  onOpenFile?: (path: string) => void;
}) {
  const { t } = useTranslation();
  const diffs = (toolCall.content ?? []).filter(c => c.type === 'diff');
  const other = (toolCall.content ?? []).filter(c => c.type !== 'diff');
  const hasDetail =
    toolCallError(toolCall) != null ||
    diffs.length > 0 ||
    other.length > 0 ||
    toolCall.rawInput != null ||
    toolCall.rawOutput != null ||
    (toolCall.locations?.length ?? 0) > 0;

  const isRunning = toolCall.status === 'in_progress' || toolCall.status === 'pending';
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const elapsedSeconds =
    isRunning && toolCall.startTime ? Math.floor((Date.now() - toolCall.startTime) / 1000) : null;
  const duration = elapsedSeconds !== null ? `${elapsedSeconds}s` : undefined;

  return (
    <ToolCallCard
      tool={toolCall.kind ?? 'tool'}
      title={toolCall.title ?? toolCall.toolCallId}
      status={toolCallCardStatus(toolCall.status)}
      statusLabels={{
        pending: t('acp_chat.tool_status_pending'),
        running: t('acp_chat.tool_status_running'),
        success: t('acp_chat.tool_status_success'),
        error: t('acp_chat.tool_status_error'),
      }}
      toggleDetailLabel={t('acp_chat.tool_toggle_detail')}
      detail={hasDetail ? <ToolCallDetail toolCall={toolCall} onOpenFile={onOpenFile} /> : undefined}
      preview={toolCallPreview(toolCall)}
      duration={duration}
    />
  );
});

const TranscriptTerminal = memo(function TranscriptTerminal({ card }: { card: AcpTerminalCard }) {
  const { t } = useTranslation();
  const lines = card.output.split('\n');
  return (
    <ToolCallCard
      tool={t('terminal.card_label')}
      title={card.command ? stripAnsi(card.command) : t('terminal.card_label')}
      status="success"
      toggleDetailLabel={t('acp_chat.tool_toggle_detail')}
      detail={<TerminalOutput lines={lines} maxHeight="15rem" autoScroll={false} />}
      preview={tailLines(lines, 1).length > 0 ? <LogTail lines={lines} /> : undefined}
    />
  );
});

const TranscriptError = memo(function TranscriptError({ card }: { card: AcpErrorCard }) {
  return <ChatErrorCard message={card.message} fallbackTitleKey="acp_chat.turn_failed_label" />;
});

export interface TranscriptItemsProps {
  session: AcpSessionState;
  agentName: string | null;
  onRespondPermission: (optionId: string) => void;
  onOpenFile?: (path: string) => void;
}

interface RenderItemContext {
  session: AcpSessionState;
  agentName: string | null;
  latestErrorItemId: string | null;
  pending: AcpSessionState['pendingPermission'];
  anchorId: string | null;
  onRespondPermission: (optionId: string) => void;
  onOpenFile?: (path: string) => void;
}

function renderItem(item: AcpTimelineItem, isLatest: boolean, ctx: RenderItemContext): ReactNode {
  const { session, agentName, latestErrorItemId, pending, anchorId, onRespondPermission, onOpenFile } = ctx;
  let rendered: ReactNode = null;
  if (item.kind === 'message') {
    const message = session.messages[item.id];
    rendered = message ? (
      <TranscriptMessage key={`m-${item.id}`} message={message} agentName={agentName} isLatest={isLatest} />
    ) : null;
  } else if (item.kind === 'terminal') {
    const card = session.terminals[item.id];
    rendered = card ? <TranscriptTerminal key={`x-${item.id}`} card={card} /> : null;
  } else if (item.kind === 'error') {
    const card = session.errorCards[item.id];
    rendered =
      card && item.id !== latestErrorItemId ? <TranscriptError key={`e-${item.id}`} card={card} /> : null;
  } else {
    const toolCall = session.toolCalls[item.id];
    rendered = toolCall ? <TranscriptToolCall key={`t-${item.id}`} toolCall={toolCall} onOpenFile={onOpenFile} /> : null;
  }
  const anchorHere = pending && anchorId != null && item.kind === 'tool_call' && item.id === anchorId;
  if (!anchorHere) return rendered;
  return [
    rendered,
    <PermissionCard key={`perm-${item.id}`} permission={pending} onRespond={onRespondPermission} />,
  ];
}

interface TimelineGroup {
  turnId: string | undefined;
  entries: Array<{ item: AcpTimelineItem; index: number }>;
}

function groupByTurn(items: AcpTimelineItem[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  for (const [index, item] of items.entries()) {
    const last = groups[groups.length - 1];
    if (last && item.turnId !== undefined && last.turnId === item.turnId) {
      last.entries.push({ item, index });
    } else {
      groups.push({ turnId: item.turnId, entries: [{ item, index }] });
    }
  }
  return groups;
}

/** The whole timeline. Memoized, and every entry is memoized on its own slice of state, so a streamed chunk or a keystroke elsewhere re-renders only what changed. */
export const TranscriptItems = memo(function TranscriptItems({
  session,
  agentName,
  onRespondPermission,
  onOpenFile,
}: TranscriptItemsProps) {
  const { t } = useTranslation();
  const pending = session.pendingPermission;
  const pendingToolCallId = pending?.toolCall.toolCallId ?? null;
  const anchorId =
    pendingToolCallId != null &&
    session.items.some(it => it.kind === 'tool_call' && it.id === pendingToolCallId)
      ? pendingToolCallId
      : null;

  const latestErrorItemId = useMemo(
    () =>
      session.error != null ? ([...session.items].reverse().find(it => it.kind === 'error')?.id ?? null) : null,
    [session.error, session.items],
  );
  const groups = useMemo(() => groupByTurn(session.items), [session.items]);

  const ctx: RenderItemContext = { session, agentName, latestErrorItemId, pending, anchorId, onRespondPermission, onOpenFile };
  const render = (entry: { item: AcpTimelineItem; index: number }) =>
    renderItem(entry.item, entry.index === session.items.length - 1, ctx);

  return (
    <>
      {groups.map(group => {
        const steps = group.entries.filter(({ item }) => item.kind === 'tool_call' || item.kind === 'terminal');
        const rest = group.entries.filter(({ item }) => item.kind !== 'tool_call' && item.kind !== 'terminal');
        if (group.turnId === undefined || steps.length === 0 || rest.length === 0) {
          return group.entries.map(render);
        }
        return (
          <div key={`turn-${group.turnId}`} className="space-y-2">
            <Collapsible
              defaultOpen={true}
              title={t('acp_chat.turn_steps_toggle', { count: steps.length })}>
              <div className="space-y-2">{steps.map(render)}</div>
            </Collapsible>
            {rest.map(render)}
          </div>
        );
      })}
      {pending && anchorId == null && (
        <PermissionCard key="perm-fallback" permission={pending} onRespond={onRespondPermission} />
      )}
    </>
  );
});
