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
  tailLines,
  TerminalOutput,
  TOOL_CALL_PREVIEW_LINES,
  ToolCallCard,
  type ToolCallCardProps,
} from '@contenox/ui';
import { approvalDecisionFromMeta, toolCallError } from '@contenox/ui/session-lib';
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
import { useDismissedErrors } from '../../../hooks/useDismissedErrors';
import { translateCommandConfirmation } from '../../../lib/commandConfirmations';
import { failureTurnKey } from '../../../lib/dismissedErrors';
import { describePersistedFailures, isPersistedFailure } from '../../../lib/persistedFailure';
import { translateRoutingLabel, translateRuntimeText } from '../../../lib/runtimeTexts';
import { shellCommandLine, shellOutputLines } from '../../../lib/shellExecution';
import {
  shouldShowStreamingCaret,
  shouldShowStreamingPlaceholder,
  shouldShowWaitingForModel,
} from '../lib/streamingPresentation';
import { splitLeadingThinking } from '../lib/thinkingTags';
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
    <pre className="break-all whitespace-pre-wrap">
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
    lines = running
      ? tailLines(streamed, TOOL_CALL_PREVIEW_LINES)
      : (shellOutputLines(toolCall.rawOutput) ?? tailLines(streamed, TOOL_CALL_PREVIEW_LINES));
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
  const inline = isUser
    ? { thinking: null, answer: message.text }
    : splitLeadingThinking(translateCommandConfirmation(message.text, t));
  const thinking = [message.thinking, inline.thinking].filter(Boolean).join('\n\n');
  const thinkingStreaming =
    message.thinkingStreaming ||
    (inline.thinking !== null && inline.answer === '' && !!message.streaming);

  return (
    <ChatMessage
      role={message.role}
      roleLabel={roleLabel}
      appearance="plain"
      showRoleLabel={showRoleLabel}
      isLatest={isLatest}
      collapsible={false}
      copyText={inline.answer || undefined}
      copyLabel={t('acp_chat.copy')}
      copiedLabel={t('acp_chat.copied')}>
      {thinking && (
        <Collapsible
          defaultOpen={false}
          title={<ThinkingHeader streaming={thinkingStreaming} />}
          className="mb-2">
          <ChatStreamThinkingBox className="mt-1">{thinking}</ChatStreamThinkingBox>
        </Collapsible>
      )}
      {inline.answer ? (
        <>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatTranscriptMarkdownComponents}>
            {inline.answer}
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

function ToolCallDetail({
  toolCall,
  onOpenFile,
  canOpenFile,
}: {
  toolCall: AcpToolCallState;
  onOpenFile?: (path: string) => void;
  canOpenFile?: (path: string) => boolean;
}) {
  const { t } = useTranslation();
  const diffs = (toolCall.content ?? []).filter(c => c.type === 'diff');
  const other = (toolCall.content ?? []).filter(c => c.type !== 'diff');
  const hasRaw = toolCall.rawInput != null || toolCall.rawOutput != null || other.length > 0;
  const errorText = toolCallError(toolCall);

  const errorNotice = errorText ? (
    <InlineNotice variant="error" title={t('acp_chat.tool_error_label')}>
      {errorText}
    </InlineNotice>
  ) : null;

  const decision = approvalDecisionFromMeta(toolCall.meta);
  const decisionNotice =
    decision && decision.note !== '' ? (
      <InlineNotice variant={decision.approved ? 'info' : 'warning'}>
        {translateRuntimeText(decision.note, t)}
      </InlineNotice>
    ) : null;

  const shellLines =
    toolCall.kind === 'execute' && other.length === 0 ? shellOutputLines(toolCall.rawOutput) : null;
  if (shellLines) {
    const commandLine = shellCommandLine(toolCall.rawInput);
    return (
      <div className="space-y-3">
        {decisionNotice}
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
      {decisionNotice}
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
          {toolCall.locations.map((loc, i) => {
            const openable = loc.path != null && (canOpenFile?.(loc.path) ?? true);
            return (
              <li key={locationKey(loc.path, loc.line, i)} className="break-all">
                {onOpenFile && loc.path ? (
                  <span title={openable ? undefined : t('workspace.file_outside_project')}>
                    <Button
                      type="button"
                      variant="text"
                      size="xs"
                      disabled={!openable}
                      onClick={() => onOpenFile(loc.path!)}>
                      {loc.path}
                      {loc.line ? `:${loc.line}` : ''}
                    </Button>
                  </span>
                ) : (
                  <>
                    {loc.path}
                    {loc.line ? `:${loc.line}` : ''}
                  </>
                )}
              </li>
            );
          })}
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
  canOpenFile,
}: {
  toolCall: AcpToolCallState;
  onOpenFile?: (path: string) => void;
  canOpenFile?: (path: string) => boolean;
}) {
  const { t } = useTranslation();
  const diffs = (toolCall.content ?? []).filter(c => c.type === 'diff');
  const other = (toolCall.content ?? []).filter(c => c.type !== 'diff');
  const hasDetail =
    toolCallError(toolCall) != null ||
    approvalDecisionFromMeta(toolCall.meta) != null ||
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
      title={translateRoutingLabel(toolCall.title ?? toolCall.toolCallId, t)}
      status={toolCallCardStatus(toolCall.status)}
      statusLabels={{
        pending: t('acp_chat.tool_status_pending'),
        running: t('acp_chat.tool_status_running'),
        success: t('acp_chat.tool_status_success'),
        error: t('acp_chat.tool_status_error'),
      }}
      toggleDetailLabel={t('acp_chat.tool_toggle_detail')}
      detail={
        hasDetail ? (
          <ToolCallDetail toolCall={toolCall} onOpenFile={onOpenFile} canOpenFile={canOpenFile} />
        ) : undefined
      }
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

const TranscriptPersistedFailure = memo(function TranscriptPersistedFailure({
  texts,
  onDismiss,
}: {
  texts: string[];
  onDismiss: () => void;
}) {
  const { summary, details } = describePersistedFailures(texts);
  return (
    <ChatErrorCard
      message={details}
      summary={summary}
      details={details}
      fallbackTitleKey="acp_chat.error_banner_headline"
      onDismiss={onDismiss}
    />
  );
});

const TranscriptError = memo(function TranscriptError({
  card,
  onDismiss,
  onOpenSettings,
}: {
  card: AcpErrorCard;
  onDismiss: () => void;
  onOpenSettings?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ChatErrorCard
      message={card.message}
      fallbackTitleKey="acp_chat.error_banner_headline"
      onDismiss={onDismiss}
      actions={kind =>
        kind === 'model_unavailable' && onOpenSettings ? (
          <Button type="button" variant="secondary" size="sm" onClick={onOpenSettings}>
            {t('acp_recovery.model_unavailable_action')}
          </Button>
        ) : null
      }
    />
  );
});

export interface TranscriptItemsProps {
  session: AcpSessionState;
  agentName: string | null;
  onRespondPermission: (optionId: string) => void;
  onOpenFile?: (path: string) => void;
  canOpenFile?: (path: string) => boolean;
  onOpenSettings?: () => void;
}

interface RenderItemContext {
  session: AcpSessionState;
  agentName: string | null;
  dismissedErrors: ReadonlySet<string>;
  dismissError: (id: string, turnKey?: string) => void;
  pending: AcpSessionState['pendingPermission'];
  anchorId: string | null;
  onRespondPermission: (optionId: string) => void;
  onOpenFile?: (path: string) => void;
  canOpenFile?: (path: string) => boolean;
  onOpenSettings?: () => void;
}

function persistedFailureText(
  session: AcpSessionState,
  item: AcpTimelineItem | undefined,
): string | null {
  if (!item || item.kind !== 'message') return null;
  const message = session.messages[item.id];
  if (!message || message.role !== 'assistant' || message.streaming) return null;
  return isPersistedFailure(message.text) ? message.text : null;
}

function userTurnOrdinal(session: AcpSessionState, index: number): number {
  let count = 0;
  for (let i = 0; i <= index && i < session.items.length; i += 1) {
    const item = session.items[i];
    if (item.kind === 'message' && session.messages[item.id]?.role === 'user') count += 1;
  }
  return count;
}

function renderItem(
  item: AcpTimelineItem,
  index: number,
  isLatest: boolean,
  ctx: RenderItemContext,
): ReactNode {
  const {
    session,
    agentName,
    dismissedErrors,
    dismissError,
    pending,
    anchorId,
    onRespondPermission,
    onOpenFile,
    canOpenFile,
    onOpenSettings,
  } = ctx;
  let rendered: ReactNode = null;
  if (item.kind === 'message' && persistedFailureText(session, item) !== null) {
    if (persistedFailureText(session, session.items[index - 1]) !== null) return null;
    const texts: string[] = [];
    for (let i = index; i < session.items.length; i += 1) {
      const text = persistedFailureText(session, session.items[i]);
      if (text === null) break;
      texts.push(text);
    }
    const id = failureTurnKey(userTurnOrdinal(session, index));
    rendered = dismissedErrors.has(id) ? null : (
      <TranscriptPersistedFailure
        key={`f-${item.id}`}
        texts={texts}
        onDismiss={() => dismissError(id)}
      />
    );
  } else if (item.kind === 'message') {
    const message = session.messages[item.id];
    rendered = message ? (
      <TranscriptMessage
        key={`m-${item.id}`}
        message={message}
        agentName={agentName}
        isLatest={isLatest}
      />
    ) : null;
  } else if (item.kind === 'terminal') {
    const card = session.terminals[item.id];
    rendered = card ? <TranscriptTerminal key={`x-${item.id}`} card={card} /> : null;
  } else if (item.kind === 'error') {
    const card = session.errorCards[item.id];
    rendered =
      card && !dismissedErrors.has(item.id) ? (
        <TranscriptError
          key={`e-${item.id}`}
          card={card}
          onDismiss={() => dismissError(item.id, failureTurnKey(userTurnOrdinal(session, index)))}
          onOpenSettings={onOpenSettings}
        />
      ) : null;
  } else {
    const toolCall = session.toolCalls[item.id];
    rendered = toolCall ? (
      <TranscriptToolCall
        key={`t-${item.id}`}
        toolCall={toolCall}
        onOpenFile={onOpenFile}
        canOpenFile={canOpenFile}
      />
    ) : null;
  }
  const anchorHere =
    pending && anchorId != null && item.kind === 'tool_call' && item.id === anchorId;
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
  canOpenFile,
  onOpenSettings,
}: TranscriptItemsProps) {
  const { t } = useTranslation();
  const pending = session.pendingPermission;
  const pendingToolCallId = pending?.toolCall.toolCallId ?? null;
  const anchorId =
    pendingToolCallId != null &&
    session.items.some(it => it.kind === 'tool_call' && it.id === pendingToolCallId)
      ? pendingToolCallId
      : null;

  const { dismissedErrors, dismissError: dismissOne } = useDismissedErrors(session.sessionId);
  const dismissError = (id: string, turnKey?: string) => {
    dismissOne(id);
    if (turnKey) dismissOne(turnKey);
  };
  const groups = useMemo(() => groupByTurn(session.items), [session.items]);

  const ctx: RenderItemContext = {
    session,
    agentName,
    dismissedErrors,
    dismissError,
    pending,
    anchorId,
    onRespondPermission,
    onOpenSettings,
    onOpenFile,
    canOpenFile,
  };
  const render = (entry: { item: AcpTimelineItem; index: number }) =>
    renderItem(entry.item, entry.index, entry.index === session.items.length - 1, ctx);

  return (
    <>
      {groups.map(group => {
        const steps = group.entries.filter(
          ({ item }) => item.kind === 'tool_call' || item.kind === 'terminal',
        );
        const rest = group.entries.filter(
          ({ item }) => item.kind !== 'tool_call' && item.kind !== 'terminal',
        );
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
      {shouldShowWaitingForModel(session) && (
        <ChatTranscriptStreamingPlaceholder>
          {t('acp_chat.waiting_for_model')}
          <ChatStreamingCaret />
        </ChatTranscriptStreamingPlaceholder>
      )}
      {pending && anchorId == null && (
        <PermissionCard key="perm-fallback" permission={pending} onRespond={onRespondPermission} />
      )}
    </>
  );
});
