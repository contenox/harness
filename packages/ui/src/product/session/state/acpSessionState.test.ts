import { describe, expect, it } from 'vitest';
import type { ToolCallEvent } from '@contenox/acp-client';
import { acpSessionReducer, initialAcpSessionState, type AcpSessionState } from './acpSessionState';


function run(...actions: Parameters<typeof acpSessionReducer>[1][]): AcpSessionState {
  return actions.reduce(acpSessionReducer, initialAcpSessionState);
}

describe('acpSessionReducer: unified timeline (D4)', () => {
  it('orders interleaved live messages and tool calls by first arrival, not by kind', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'prompt_start' },
      { type: 'user_message_chunk', id: 'u1', text: 'run ls' },
      {
        type: 'tool_call',
        event: { updateKind: 'tool_call', toolCallId: 'tc-1', title: 'ls', status: 'pending' },
      },
      { type: 'message_chunk', id: 'a1', text: 'Running ' },
      {
        type: 'tool_call',
        event: { updateKind: 'tool_call_update', toolCallId: 'tc-1', status: 'completed' },
      },
      { type: 'message_chunk', id: 'a1', text: 'ls now.' },
    );

    expect(state.items).toEqual([
      { kind: 'message', id: 'u1' },
      { kind: 'tool_call', id: 'tc-1', turnId: 'turn-0' },
      { kind: 'message', id: 'a1', turnId: 'turn-0' },
    ]);
    expect(state.messages['u1']).toMatchObject({ role: 'user', text: 'run ls' });
    expect(state.messages['a1']).toMatchObject({
      role: 'assistant',
      text: 'Running ls now.',
      streaming: true,
    });
    expect(state.toolCalls['tc-1']).toMatchObject({ title: 'ls', status: 'completed' });

    expect(state.items.filter(it => it.id === 'tc-1')).toHaveLength(1);
  });

  it('tags a turn\'s tool_call and message items with the same turnId, for grouping the steps trail above the answer', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'prompt_start' },
      {
        type: 'tool_call',
        event: { updateKind: 'tool_call', toolCallId: 'tc-1', title: 'ls', status: 'pending' },
      },
      {
        type: 'tool_call',
        event: { updateKind: 'tool_call', toolCallId: 'tc-2', title: 'cat', status: 'pending' },
      },
      { type: 'message_chunk', id: 'a1', text: 'done' },
      { type: 'prompt_end', stopReason: 'end_turn' },
    );
    const turnId = state.items[0]?.turnId;
    expect(turnId).toBeDefined();
    expect(state.items.map(it => it.turnId)).toEqual([turnId, turnId, turnId]);



    const untagged = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'user_message_chunk', id: 'u1', text: 'hi' },
      { type: 'message_chunk', id: 'replay-1', text: 'reply' },
    );
    expect(untagged.items.every(it => it.turnId === undefined)).toBe(true);
  });

  it('attaches thought chunks to their message by messageId as collapsible data, not a separate timeline item', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'prompt_start' },
      { type: 'thought_chunk', id: 'a1', text: 'Let me check ' },
      { type: 'thought_chunk', id: 'a1', text: 'the docs.' },
      { type: 'message_chunk', id: 'a1', text: 'Sure, here you go.' },
    );



    expect(state.items).toEqual([{ kind: 'message', id: 'a1', turnId: 'turn-0' }]);
    expect(state.messages['a1']).toMatchObject({
      role: 'assistant',
      text: 'Sure, here you go.',
      thinking: 'Let me check the docs.',
      streaming: true,
      thinkingStreaming: true,
    });
  });

  it('prompt_end/prompt_error clear streaming flags on every message, including thinking', () => {
    const streaming = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'prompt_start' },
      { type: 'thought_chunk', id: 'a1', text: 'hmm' },
      { type: 'message_chunk', id: 'a1', text: 'ok' },
    );
    expect(streaming.messages['a1']).toMatchObject({ streaming: true, thinkingStreaming: true });

    const ended = acpSessionReducer(streaming, { type: 'prompt_end', stopReason: 'end_turn' });
    expect(ended.messages['a1']).toMatchObject({
      streaming: false,
      thinkingStreaming: false,
      text: 'ok',
      thinking: 'hmm',
    });
    expect(ended.isPrompting).toBe(false);
    expect(ended.stopReason).toBe('end_turn');

    const erroredState = acpSessionReducer(streaming, { type: 'prompt_error', message: 'boom' });
    expect(erroredState.messages['a1']).toMatchObject({
      streaming: false,
      thinkingStreaming: false,
    });
    expect(erroredState.error).toBe('boom');
  });

  it('prompt_error anchors the failure as its own transcript item (not only the top banner) so the chat never just goes quiet', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'user_message_chunk', id: 'u1', text: 'do the thing' },
      { type: 'prompt_start' },
      { type: 'prompt_error', message: 'chain execution failed: model unavailable' },
    );
    const errorItems = state.items.filter(it => it.kind === 'error');
    expect(errorItems).toHaveLength(1);

    expect(state.items.at(-1)).toEqual(errorItems[0]);
    expect(state.errorCards[errorItems[0].id]).toEqual({
      id: errorItems[0].id,
      message: 'chain execution failed: model unavailable',
    });

    expect(state.error).toBe('chain execution failed: model unavailable');
    expect(state.isPrompting).toBe(false);
  });

  it('each failed turn keeps its own card — the transcript retains every failure, not just the latest', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'prompt_start' },
      { type: 'prompt_error', message: 'first failure' },
      { type: 'prompt_start' },
      { type: 'prompt_error', message: 'second failure' },
    );
    const errorCards = state.items
      .filter(it => it.kind === 'error')
      .map(it => state.errorCards[it.id].message);
    expect(errorCards).toEqual(['first failure', 'second failure']);
  });
});

describe('acpSessionReducer: stable message identity within one turn', () => {









  it('no-id-then-id: a turn-id-fallback chunk followed by a real messageId chunk yields ONE item', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },

      { type: 'message_chunk', id: 'assistant-1', text: 'Hello' },

      { type: 'message_chunk', id: 'msg-42', text: ' world' },
    );

    expect(state.items).toEqual([{ kind: 'message', id: 'assistant-1', turnId: 'turn-0' }]);
    expect(Object.keys(state.messages)).toEqual(['assistant-1']);
    expect(state.messages['assistant-1']).toMatchObject({
      role: 'assistant',
      text: 'Hello world',
      streaming: true,
    });
  });

  it('id-then-no-id: a real messageId chunk followed by a turn-id-fallback chunk yields ONE item', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      { type: 'message_chunk', id: 'msg-42', text: 'Hello' },

      { type: 'message_chunk', id: 'assistant-1', text: ' world' },
    );

    expect(state.items).toEqual([{ kind: 'message', id: 'msg-42', turnId: 'turn-0' }]);
    expect(Object.keys(state.messages)).toEqual(['msg-42']);
    expect(state.messages['msg-42']).toMatchObject({
      role: 'assistant',
      text: 'Hello world',
      streaming: true,
    });
  });

  it('thought-chunk-then-text-chunk with disagreeing ids yields ONE item with both thinking and text', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      { type: 'thought_chunk', id: 'assistant-1', text: 'Let me think…' },
      { type: 'message_chunk', id: 'msg-42', text: 'Here you go.' },
    );

    expect(state.items).toEqual([{ kind: 'message', id: 'assistant-1', turnId: 'turn-0' }]);
    expect(Object.keys(state.messages)).toEqual(['assistant-1']);
    expect(state.messages['assistant-1']).toMatchObject({
      role: 'assistant',
      text: 'Here you go.',
      thinking: 'Let me think…',
      streaming: true,
      thinkingStreaming: true,
    });
  });

  it('a NEW turn does not inherit the previous turn canonical id (no cross-turn bleed)', () => {
    const first = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      { type: 'message_chunk', id: 'assistant-1', text: 'first turn' },
      { type: 'prompt_end', stopReason: 'end_turn' },
    );
    const second = acpSessionReducer(acpSessionReducer(first, { type: 'prompt_start' }), {
      type: 'message_chunk',
      id: 'assistant-2',
      text: 'second turn',
    });

    expect(second.items).toEqual([
      { kind: 'message', id: 'assistant-1', turnId: 'turn-0' },
      { kind: 'message', id: 'assistant-2', turnId: 'turn-1' },
    ]);
    expect(second.messages['assistant-1']).toMatchObject({ text: 'first turn' });
    expect(second.messages['assistant-2']).toMatchObject({ text: 'second turn' });
  });

  it('a NEW turn whose first chunk REUSES a prior closed turn id is disambiguated, not merged into the old message (thought_chunk)', () => {



    const first = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      { type: 'thought_chunk', id: 'assistant-1', text: 'first turn thinking' },
      { type: 'message_chunk', id: 'assistant-1', text: 'first turn answer' },
      { type: 'prompt_end', stopReason: 'end_turn' },
    );
    const second = acpSessionReducer(
      acpSessionReducer(first, { type: 'prompt_start' }),
      { type: 'thought_chunk', id: 'assistant-1', text: 'second turn thinking' },
    );


    expect(second.messages['assistant-1']).toMatchObject({
      thinking: 'first turn thinking',
      text: 'first turn answer',
    });

    const secondTurnId = second.items[second.items.length - 1]?.id;
    expect(secondTurnId).toBeDefined();
    expect(secondTurnId).not.toBe('assistant-1');
    expect(second.messages[secondTurnId!]).toMatchObject({ thinking: 'second turn thinking' });
    expect(second.items).toHaveLength(2);
  });

  it('a REPEATED message_chunk id across turns is likewise disambiguated', () => {
    const first = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      { type: 'message_chunk', id: 'assistant-1', text: 'first turn' },
      { type: 'prompt_end', stopReason: 'end_turn' },
    );
    const second = acpSessionReducer(acpSessionReducer(first, { type: 'prompt_start' }), {
      type: 'message_chunk',
      id: 'assistant-1',
      text: 'second turn',
    });

    expect(second.messages['assistant-1']).toMatchObject({ text: 'first turn' });
    const secondTurnId = second.items[second.items.length - 1]?.id;
    expect(secondTurnId).not.toBe('assistant-1');
    expect(second.messages[secondTurnId!]).toMatchObject({ text: 'second turn' });
  });

  it('out-of-turn (no active prompt) chunks are never merged, even with differing ids', () => {



    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'message_chunk', id: 'replay-a', text: 'one' },
      { type: 'message_chunk', id: 'replay-b', text: 'two' },
    );
    expect(state.items).toEqual([
      { kind: 'message', id: 'replay-a' },
      { kind: 'message', id: 'replay-b' },
    ]);
  });
});

describe('acpSessionReducer: session/load replay ordering', () => {
  it('reproduces a full replay sequence (user -> thought -> assistant -> tool -> tool result) in wire-arrival order', () => {


    const state = run(
      { type: 'session_reset', sessionId: 'sess-replay' },
      { type: 'user_message_chunk', id: 'replay-0', text: 'hi there' },
      { type: 'thought_chunk', id: 'replay-1', text: 'thinking about it' },
      { type: 'message_chunk', id: 'replay-1', text: 'Hello!' },
      {
        type: 'tool_call',
        event: {
          updateKind: 'tool_call',
          toolCallId: 'tc-replay',
          title: 'search',
          status: 'completed',
        },
      },
    );

    expect(state.items).toEqual([
      { kind: 'message', id: 'replay-0' },
      { kind: 'message', id: 'replay-1' },
      { kind: 'tool_call', id: 'tc-replay' },
    ]);
    expect(state.messages['replay-0']).toMatchObject({ role: 'user', text: 'hi there' });
    expect(state.messages['replay-1']).toMatchObject({
      role: 'assistant',
      text: 'Hello!',
      thinking: 'thinking about it',
    });



    expect(state.messages['replay-0'].streaming).toBeFalsy();
    expect(state.messages['replay-1'].streaming).toBeFalsy();
    expect(state.messages['replay-1'].thinkingStreaming).toBeFalsy();
  });

  it('session_reset clears the previous session entirely before a new replay lands', () => {
    const before = run(
      { type: 'session_reset', sessionId: 'sess-a' },
      { type: 'message_chunk', id: 'a1', text: 'old session content' },
      { type: 'plan', entries: [{ content: 'do it', priority: 'high', status: 'in_progress' }] },
    );
    expect(before.items).toHaveLength(1);

    const after = acpSessionReducer(before, { type: 'session_reset', sessionId: 'sess-b' });
    expect(after).toEqual({ ...initialAcpSessionState, sessionId: 'sess-b' });
  });

  it('session_reset clears error, plan, usage, and configOptions specifically — a fresh session shows no leftover banner/plan/meter/config header', () => {
    const dirty = run(
      { type: 'session_reset', sessionId: 'sess-a' },
      { type: 'plan', entries: [{ content: 'route it', priority: 'high', status: 'completed' }] },
      { type: 'usage', usage: { used: 135, size: 26603 } },
      {
        type: 'config_options',
        configOptions: [
          { id: 'model', name: 'Model', type: 'string', currentValue: 'x', options: [] },
        ],
      },
      { type: 'prompt_start' },
      { type: 'prompt_error', message: 'chain execution failed' },
    );
    expect(dirty.error).toBe('chain execution failed');
    expect(dirty.plan).toHaveLength(1);
    expect(dirty.usage).not.toBeNull();
    expect(dirty.configOptions).toHaveLength(1);

    const fresh = acpSessionReducer(dirty, { type: 'session_reset', sessionId: null });
    expect(fresh.error).toBeNull();
    expect(fresh.plan).toEqual([]);
    expect(fresh.usage).toBeNull();
    expect(fresh.configOptions).toEqual([]);
    expect(fresh.items).toEqual([]);
  });
});

describe('acpSessionReducer: tool calls, plan, usage, config, commands', () => {
  it('merges tool_call_update onto an existing card in place', () => {
    const created: ToolCallEvent = {
      updateKind: 'tool_call',
      toolCallId: 'tc-1',
      title: 'Run ls',
      kind: 'execute',
      status: 'pending',
    };
    const updated: ToolCallEvent = {
      updateKind: 'tool_call_update',
      toolCallId: 'tc-1',
      status: 'completed',
      rawOutput: 'ok',
    };
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'tool_call', event: created },
      { type: 'tool_call', event: updated },
    );
    expect(state.toolCalls['tc-1']).toMatchObject({
      title: 'Run ls',
      kind: 'execute',
      status: 'completed',
      rawOutput: 'ok',
    });
  });

  it('replaces plan/usage/configOptions/availableCommands wholesale on each update', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'plan', entries: [{ content: 'a', priority: 'low', status: 'pending' }] },
      { type: 'usage', usage: { used: 10, size: 100 } },
      { type: 'available_commands', commands: [{ name: 'help', description: 'help' }] },
      {
        type: 'config_options',
        configOptions: [
          { id: 'think', name: 'Think', type: 'boolean', currentValue: 'true', options: [] },
        ],
      },
    );
    expect(state.plan).toEqual([{ content: 'a', priority: 'low', status: 'pending' }]);
    expect(state.usage).toEqual({ used: 10, size: 100 });
    expect(state.availableCommands).toEqual([{ name: 'help', description: 'help' }]);
    expect(state.configOptions).toEqual([
      { id: 'think', name: 'Think', type: 'boolean', currentValue: 'true', options: [] },
    ]);
  });
});

describe('acpSessionReducer: terminal stream + cards', () => {
  it('appends terminal_output chunks and tracks the offset', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'terminal_output', payload: { sessionId: 's1', offset: 3, chunk: 'foo' } },
      { type: 'terminal_output', payload: { sessionId: 's1', offset: 6, chunk: 'bar' } },
    );
    expect(state.terminal).toEqual({ text: 'foobar', offset: 6 });
  });

  it('replaces the buffer on a reset chunk (reconnect snapshot)', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'terminal_output', payload: { sessionId: 's1', offset: 6, chunk: 'foobar' } },
      {
        type: 'terminal_output',
        payload: { sessionId: 's1', offset: 4, chunk: 'fresh', reset: true },
      },
    );
    expect(state.terminal).toEqual({ text: 'fresh', offset: 4 });
  });

  it('records a terminal_card as a distinct timeline item', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'terminal_card', id: 'term-1', command: 'echo hi', output: 'hi' },
    );
    expect(state.items).toContainEqual({ kind: 'terminal', id: 'term-1' });
    expect(state.terminals['term-1']).toEqual({ id: 'term-1', command: 'echo hi', output: 'hi' });
  });

  it('a completed local_shell (execute-kind) tool call prints its command+output into the terminal panel scrollback', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      {
        type: 'tool_call',
        event: {
          updateKind: 'tool_call',
          toolCallId: 'tc-1',
          kind: 'execute',
          status: 'pending',
          rawInput: { command: 'echo', args: ['hi'] },
        },
      },
      {
        type: 'tool_call',
        event: {
          updateKind: 'tool_call_update',
          toolCallId: 'tc-1',
          kind: 'execute',
          status: 'completed',
          rawOutput: 'hi\n',
        },
      },
    );
    expect(state.terminal?.text).toContain('$ echo hi');
    expect(state.terminal?.text).toContain('hi');
  });

  it('does not print a shell tool call output twice for repeated updates', () => {
    const withPending = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      {
        type: 'tool_call',
        event: {
          updateKind: 'tool_call_update',
          toolCallId: 'tc-1',
          kind: 'execute',
          status: 'completed',
          rawInput: { command: 'echo', args: ['hi'] },
          rawOutput: 'hi\n',
        },
      },
    );
    const afterRepeat = acpSessionReducer(withPending, {
      type: 'tool_call',
      event: {
        updateKind: 'tool_call_update',
        toolCallId: 'tc-1',
        kind: 'execute',
        status: 'completed',
        rawOutput: 'hi\n',
      },
    });
    expect(afterRepeat.terminal?.text).toBe(withPending.terminal?.text);
  });

  it('does not print a non-shell (e.g. read/write) tool call into the terminal panel', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      {
        type: 'tool_call',
        event: { updateKind: 'tool_call_update', toolCallId: 'tc-1', kind: 'read', status: 'completed' },
      },
    );
    expect(state.terminal).toBeNull();
  });

  it('clears terminal state on session_reset', () => {
    const dirty = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'terminal_output', payload: { sessionId: 's1', offset: 3, chunk: 'foo' } },
      { type: 'terminal_card', id: 'term-1', command: 'echo hi', output: 'hi' },
    );
    const fresh = acpSessionReducer(dirty, { type: 'session_reset', sessionId: 's2' });
    expect(fresh.terminal).toBeNull();
    expect(fresh.terminals).toEqual({});
  });
});

describe('acpSessionReducer: permission gate', () => {
  it('sets and clears pendingPermission', () => {
    const withRequest = run(
      { type: 'session_reset', sessionId: 's1' },
      {
        type: 'permission_request',
        request: {
          sessionId: 's1',
          toolCall: { toolCallId: 'tc-1' },
          options: [{ optionId: 'a', name: 'A', kind: 'allow_once' }],
        },
      },
    );
    expect(withRequest.pendingPermission).not.toBeNull();

    const resolved = acpSessionReducer(withRequest, { type: 'permission_resolved' });
    expect(resolved.pendingPermission).toBeNull();
  });
});

describe('acpSessionReducer: prompt_end and permission', () => {
  it('prompt_end clears a pending permission left open by cancel or turn end', () => {
    const waiting = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      {
        type: 'permission_request',
        request: { sessionId: 's1', toolCall: { toolCallId: 'tc-1' }, options: [] },
      },
    );
    expect(waiting.pendingPermission).not.toBeNull();
    const ended = acpSessionReducer(waiting, { type: 'prompt_end', stopReason: 'cancelled' });
    expect(ended.pendingPermission).toBeNull();
  });
});

describe('acpSessionReducer: connection banner', () => {
  it('connection_lost sets the disconnected banner and interrupts an in-flight turn', () => {
    const prompting = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      {
        type: 'permission_request',
        request: { sessionId: 's1', toolCall: { toolCallId: 'tc-1' }, options: [] },
      },
    );
    expect(prompting.isPrompting).toBe(true);
    expect(prompting.pendingPermission).not.toBeNull();

    const dropped = acpSessionReducer(prompting, { type: 'connection_lost' });
    expect(dropped.connectionBanner).toBe('disconnected');
    expect(dropped.isPrompting).toBe(false);
    expect(dropped.pendingPermission).toBeNull();
  });

  it('connection_lost clears per-message streaming flags too (BUG 4b), not just isPrompting', () => {
    const prompting = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      { type: 'thought_chunk', id: 'a1', text: 'hmm' },
      { type: 'message_chunk', id: 'a1', text: 'partial' },
    );
    expect(prompting.messages['a1']).toMatchObject({ streaming: true, thinkingStreaming: true });

    const dropped = acpSessionReducer(prompting, { type: 'connection_lost' });



    expect(dropped.messages['a1']).toMatchObject({
      streaming: false,
      thinkingStreaming: false,
      text: 'partial',
      thinking: 'hmm',
    });
  });

  it('connection_resumed sets the resumed banner without touching timeline state', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'message_chunk', id: 'a1', text: 'hello' },
      { type: 'connection_lost' },
      { type: 'connection_resumed' },
    );
    expect(state.connectionBanner).toBe('resumed');
    expect(state.messages['a1']).toMatchObject({ text: 'hello' });
  });
});

describe('acpSessionReducer: streaming only marked during an active prompt turn (BUG 4c)', () => {
  it('does not mark a chunk as streaming when no prompt is in flight', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'message_chunk', id: 'orphan', text: 'nobody asked' },
    );
    expect(state.messages['orphan']).toMatchObject({ text: 'nobody asked', streaming: false });
  });

  it('a late chunk arriving after prompt_end does not resurrect the typing indicator', () => {
    const state = run(
      { type: 'session_reset', sessionId: 's1' },
      { type: 'prompt_start' },
      { type: 'message_chunk', id: 'a1', text: 'hi' },
      { type: 'prompt_end', stopReason: 'end_turn' },



      { type: 'message_chunk', id: 'a1', text: ' again' },
    );
    expect(state.messages['a1']).toMatchObject({ text: 'hi again', streaming: false });
  });

  it('replayed history (session/load, no active turn) still renders as completed text, not stuck streaming', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-replay' },
      { type: 'user_message_chunk', id: 'replay-0', text: 'hi there' },
      { type: 'thought_chunk', id: 'replay-1', text: 'thinking' },
      { type: 'message_chunk', id: 'replay-1', text: 'Hello!' },
    );
    expect(state.messages['replay-0']).toMatchObject({ text: 'hi there', streaming: false });
    expect(state.messages['replay-1']).toMatchObject({
      text: 'Hello!',
      thinking: 'thinking',
      streaming: false,
      thinkingStreaming: false,
    });
  });
});

describe('acpSessionReducer: purity underpins per-session multiplexing', () => {





  it('does not mutate the input state (each dispatch returns a fresh value, leaving prior slices intact)', () => {
    const a0 = run({ type: 'session_reset', sessionId: 'sess-a' });
    const b0 = run({ type: 'session_reset', sessionId: 'sess-b' });

    const a1 = acpSessionReducer(a0, { type: 'message_chunk', id: 'm-a', text: 'for A' });



    expect(a1).not.toBe(a0);
    expect(a0.messages['m-a']).toBeUndefined();
    expect(b0.messages['m-a']).toBeUndefined();
    expect(a1.messages['m-a']).toMatchObject({ text: 'for A' });
    expect(a1.sessionId).toBe('sess-a');
    expect(b0.sessionId).toBe('sess-b');
  });
});

describe('acpSessionReducer: image parts on messages', () => {
  it('a user_message_chunk carrying an image appends it to the message alongside the text, in arrival order', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'user_message_chunk', id: 'u1', text: 'what is this? ' },
      {
        type: 'user_message_chunk',
        id: 'u1',
        text: '',
        image: { data: 'aGVsbG8=', mimeType: 'image/png' },
      },
      {
        type: 'user_message_chunk',
        id: 'u1',
        text: '',
        image: { data: 'd29ybGQ=', mimeType: 'image/jpeg' },
      },
    );

    expect(state.items).toEqual([{ kind: 'message', id: 'u1' }]);
    expect(state.messages['u1']).toMatchObject({
      role: 'user',
      text: 'what is this? ',
      images: [
        { data: 'aGVsbG8=', mimeType: 'image/png' },
        { data: 'd29ybGQ=', mimeType: 'image/jpeg' },
      ],
    });
  });

  it('an image-only user_message_chunk (replayed/adopted session) creates a renderable message on its own', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-replay' },
      {
        type: 'user_message_chunk',
        id: 'replay-0',
        text: '',
        image: { data: 'aGVsbG8=', mimeType: 'image/png' },
      },
    );
    expect(state.items).toEqual([{ kind: 'message', id: 'replay-0' }]);

    expect(state.messages['replay-0']).toMatchObject({
      text: '',
      streaming: false,
      images: [{ data: 'aGVsbG8=', mimeType: 'image/png' }],
    });
  });

  it('an assistant message_chunk carrying an image lands on the turn-canonical message like its text chunks', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'prompt_start' },
      { type: 'message_chunk', id: 'a1', text: 'here you go' },


      {
        type: 'message_chunk',
        id: 'other',
        text: '',
        image: { data: 'aW1n', mimeType: 'image/png' },
      },
    );
    expect(state.items).toEqual([{ kind: 'message', id: 'a1', turnId: 'turn-0' }]);
    expect(state.messages['a1']).toMatchObject({
      role: 'assistant',
      text: 'here you go',
      images: [{ data: 'aW1n', mimeType: 'image/png' }],
      streaming: true,
    });
  });

  it('a plain text chunk leaves `images` untouched (no empty-array churn)', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'user_message_chunk', id: 'u1', text: 'no pictures here' },
    );
    expect(state.messages['u1'].images).toBeUndefined();
  });
});


describe('acpSessionReducer: discarded prompt content', () => {
  it('marks the message the content came on', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'prompt_start' },
      { type: 'user_message_chunk', id: 'u1', text: 'what is this?' },
      {
        type: 'user_message_chunk',
        id: 'u1',
        text: '',
        image: { data: 'aGVsbG8=', mimeType: 'image/png' },
      },
      { type: 'content_dropped', messageId: 'u1', kinds: ['image'] },
      { type: 'prompt_end', stopReason: 'end_turn' },
    );

    expect(state.messages['u1'].droppedContent).toEqual(['image']);

    expect(state.error).toBeNull();
    expect(state.stopReason).toBe('end_turn');
    expect(state.items.filter(i => i.kind === 'error')).toEqual([]);
  });

  it('marks no OTHER message', () => {
    const state = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'user_message_chunk', id: 'u1', text: 'first' },
      { type: 'user_message_chunk', id: 'u2', text: 'second' },
      { type: 'content_dropped', messageId: 'u2', kinds: ['image'] },
    );
    expect(state.messages['u1'].droppedContent).toBeUndefined();
    expect(state.messages['u2'].droppedContent).toEqual(['image']);
  });

  it('is a no-op for an empty report and for a message that is no longer there', () => {
    const base = run(
      { type: 'session_reset', sessionId: 'sess-1' },
      { type: 'user_message_chunk', id: 'u1', text: 'hello' },
    );
    expect(acpSessionReducer(base, { type: 'content_dropped', messageId: 'u1', kinds: [] })).toBe(
      base,
    );


    expect(
      acpSessionReducer(base, { type: 'content_dropped', messageId: 'gone', kinds: ['image'] }),
    ).toBe(base);
  });
});

describe('delivered mission questions', () => {





  it('keeps each question in its own message, with its own answer handle', () => {
    let state = acpSessionReducer(initialAcpSessionState, {
      type: 'session_reset',
      sessionId: 's1',
    });
    state = acpSessionReducer(state, {
      type: 'message_chunk',
      id: 'mission-ask-a1',
      text: 'unit chain-acp is waiting on you: what do you need clarification on?',
      missionAsk: { askId: 'a1', missionId: 'm1', summary: 'what do you need clarification on?' },
    });
    state = acpSessionReducer(state, {
      type: 'message_chunk',
      id: 'mission-ask-a2',
      text: 'unit chain-acp is waiting on you: what line should I append?',
      missionAsk: { askId: 'a2', missionId: 'm1', summary: 'what line should I append?' },
    });

    expect(state.items.filter(i => i.kind === 'message')).toHaveLength(2);
    expect(state.messages['mission-ask-a1'].missionAsk?.askId).toBe('a1');
    expect(state.messages['mission-ask-a2'].missionAsk?.askId).toBe('a2');
  });

  it('does not fold a question into the turn a session is streaming', () => {



    let state = acpSessionReducer(initialAcpSessionState, {
      type: 'session_reset',
      sessionId: 's1',
    });
    state = acpSessionReducer(state, { type: 'prompt_start' });
    state = acpSessionReducer(state, {
      type: 'message_chunk',
      id: 'turn-1',
      text: 'thinking about it… ',
    });
    state = acpSessionReducer(state, {
      type: 'message_chunk',
      id: 'mission-ask-a9',
      text: 'unit chain-acp is waiting on you: which file?',
      missionAsk: { askId: 'a9', missionId: 'm1', summary: 'which file?' },
    });

    expect(state.messages['turn-1'].text).toBe('thinking about it… ');
    expect(state.messages['turn-1'].missionAsk).toBeUndefined();
    expect(state.messages['mission-ask-a9'].missionAsk?.askId).toBe('a9');
    expect(state.messages['mission-ask-a9'].streaming).not.toBe(true);
  });
});
