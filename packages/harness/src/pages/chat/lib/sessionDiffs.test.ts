import { describe, expect, it } from 'vitest';
import type { AcpToolCallState } from '../../../hooks/acpSessionState';
import { aggregateSessionDiffs } from './sessionDiffs';

function call(id: string, diffs: Array<[string, string, string]>, status?: string): AcpToolCallState {
  return {
    toolCallId: id,
    status: status as AcpToolCallState['status'],
    content: diffs.map(([path, oldText, newText]) => ({ type: 'diff' as const, path, oldText, newText })),
  };
}

function session(calls: AcpToolCallState[], extra: Array<{ kind: string; id: string }> = []) {
  return {
    items: [...extra, ...calls.map(c => ({ kind: 'tool_call', id: c.toolCallId }))],
    toolCalls: Object.fromEntries(calls.map(c => [c.toolCallId, c])),
  };
}

describe('aggregateSessionDiffs', () => {
  it('returns nothing for a session without diffs', () => {
    expect(aggregateSessionDiffs(session([]))).toEqual([]);
    expect(
      aggregateSessionDiffs(session([{ toolCallId: 'a', content: [{ type: 'content' }] }])),
    ).toEqual([]);
  });

  it('combines first old text with last new text per file', () => {
    const out = aggregateSessionDiffs(
      session([call('1', [['a.ts', 'v0', 'v1']]), call('2', [['b.ts', 'x', 'y']]), call('3', [['a.ts', 'v1', 'v2']])]),
    );
    expect(out).toEqual([
      { path: 'a.ts', oldText: 'v0', newText: 'v2', changes: 2 },
      { path: 'b.ts', oldText: 'x', newText: 'y', changes: 1 },
    ]);
  });

  it('treats a created file as empty old text', () => {
    const out = aggregateSessionDiffs(
      session([{ toolCallId: '1', content: [{ type: 'diff', path: 'n.ts', newText: 'hi' }] }]),
    );
    expect(out[0]).toMatchObject({ oldText: '', newText: 'hi' });
  });

  it('ignores failed calls and reverted files', () => {
    const out = aggregateSessionDiffs(
      session([
        call('1', [['a.ts', 'v0', 'v1']], 'failed'),
        call('2', [['b.ts', 'x', 'y']]),
        call('3', [['b.ts', 'y', 'x']]),
      ]),
    );
    expect(out).toEqual([]);
  });

  it('ignores non tool-call items and unknown calls', () => {
    const s = session([call('1', [['a.ts', 'a', 'b']])], [{ kind: 'message', id: 'm' }]);
    s.items.push({ kind: 'tool_call', id: 'missing' });
    expect(aggregateSessionDiffs(s)).toHaveLength(1);
  });
});
