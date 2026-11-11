import { describe, expect, it } from 'vitest';
import {
  initialAcpSessionState,
  type AcpChatMessage,
  type AcpSessionState,
} from '../../../hooks/acpSessionState';
import {
  shouldShowStreamingCaret,
  shouldShowStreamingPlaceholder,
  shouldShowWaitingForModel,
} from './streamingPresentation';

function message(patch: Partial<AcpChatMessage>): AcpChatMessage {
  return { id: 'm1', role: 'assistant', text: '', ...patch };
}

function session(patch: Partial<AcpSessionState>): AcpSessionState {
  return { ...initialAcpSessionState, ...patch };
}

describe('streamingPresentation: placeholder/caret switch', () => {
  it('shows the placeholder once a turn has started but no text has arrived yet', () => {
    expect(shouldShowStreamingPlaceholder(message({ text: '', streaming: true }))).toBe(true);
  });

  it('does not show the placeholder once text has started arriving, even mid-stream', () => {
    expect(shouldShowStreamingPlaceholder(message({ text: 'Sure, ', streaming: true }))).toBe(
      false,
    );
  });

  it('does not show the placeholder for a settled empty message (no active turn)', () => {
    expect(shouldShowStreamingPlaceholder(message({ text: '', streaming: false }))).toBe(false);
    expect(shouldShowStreamingPlaceholder(message({ text: '' }))).toBe(false);
  });

  it('shows the caret only once text has arrived AND more chunks are expected', () => {
    expect(shouldShowStreamingCaret(message({ text: 'Sure, here', streaming: true }))).toBe(true);
  });

  it('hides the caret once the turn has ended (markdown renders as settled)', () => {
    expect(
      shouldShowStreamingCaret(message({ text: 'Sure, here you go.', streaming: false })),
    ).toBe(false);
  });

  it('hides the caret while no text has arrived yet (placeholder owns that state instead)', () => {
    expect(shouldShowStreamingCaret(message({ text: '', streaming: true }))).toBe(false);
  });
});

describe('streamingPresentation: waiting for the model', () => {
  it('shows while the prompt is in flight and no assistant message exists yet', () => {
    expect(shouldShowWaitingForModel(session({ isPrompting: true }))).toBe(true);
  });

  it('hides once the assistant message exists', () => {
    expect(
      shouldShowWaitingForModel(session({ isPrompting: true, activeTurnMessageId: 'm1' })),
    ).toBe(false);
  });

  it('hides when no turn is in flight', () => {
    expect(shouldShowWaitingForModel(session({}))).toBe(false);
  });

  it('hides while a permission request waits on the user', () => {
    expect(
      shouldShowWaitingForModel(
        session({
          isPrompting: true,
          pendingPermission: {} as unknown as AcpSessionState['pendingPermission'],
        }),
      ),
    ).toBe(false);
  });

  it('hides while a tool is running', () => {
    expect(
      shouldShowWaitingForModel(
        session({
          isPrompting: true,
          toolCalls: { t1: { toolCallId: 't1', status: 'in_progress' } },
        }),
      ),
    ).toBe(false);
  });

  it('shows again after a tool finishes, until the model speaks', () => {
    expect(
      shouldShowWaitingForModel(
        session({
          isPrompting: true,
          toolCalls: { t1: { toolCallId: 't1', status: 'completed' } },
        }),
      ),
    ).toBe(true);
  });
});
