import { describe, expect, it } from 'vitest';
import type { ToolCallEvent } from '@contenox/acp-client';
import { acpSessionReducer, initialAcpSessionState } from '../state/acpSessionState';
import { activityTools, changedFiles, redact, toolTitle, activityStatus } from './activity';

function feed(...events: ToolCallEvent[]) {
  return events.reduce(
    (state, event) => acpSessionReducer(state, { type: 'tool_call', event }),
    initialAcpSessionState,
  );
}

function event(partial: Partial<ToolCallEvent> & { toolCallId: string }): ToolCallEvent {
  return { updateKind: 'tool_call', ...partial };
}

describe('activityTools', () => {
  it('returns tool calls in the order the agent made them', () => {
    const state = feed(
      event({ toolCallId: 'a', title: 'Read main.go', kind: 'read', status: 'completed' }),
      event({ toolCallId: 'b', title: 'Run tests', kind: 'execute', status: 'completed' }),
      event({ toolCallId: 'c', title: 'Edit main.go', kind: 'edit', status: 'failed' }),
    );
    expect(activityTools(state).map(t => t.toolCallId)).toEqual(['a', 'b', 'c']);
  });

  it('maps the wire statuses to the four coarse words', () => {
    expect(activityStatus('pending')).toBe('pending');
    expect(activityStatus('in_progress')).toBe('running');
    expect(activityStatus('completed')).toBe('success');
    expect(activityStatus('failed')).toBe('error');
    expect(activityStatus(undefined)).toBe('running');
  });

  it('falls back to a kind sentence when the runtime gives no title', () => {
    expect(toolTitle({ toolCallId: 'a', kind: 'edit' })).toBe('Edited a file');
    expect(toolTitle({ toolCallId: 'a' })).toBe('Tool call');
  });

  it('keeps diff blocks and raw availability', () => {
    const state = feed(
      event({
        toolCallId: 'a',
        kind: 'edit',
        locations: [{ path: 'src/main.go', line: 3 }],
        content: [{ type: 'diff', path: 'src/main.go', oldText: 'x', newText: 'y' }],
        rawInput: { command: 'edit' },
      }),
    );
    const [tool] = activityTools(state);
    expect(tool.locations[0].path).toBe('src/main.go');
    expect(tool.diffs).toEqual([{ path: 'src/main.go', oldText: 'x', newText: 'y' }]);
    expect(tool.hasRaw).toBe(true);
  });
});

describe('changedFiles', () => {
  it('aggregates edits across calls and keeps first-touch order', () => {
    const state = feed(
      event({ toolCallId: 'a', kind: 'read', locations: [{ path: 'notes.md' }] }),
      event({
        toolCallId: 'b',
        kind: 'edit',
        locations: [{ path: 'notes.md' }],
        content: [{ type: 'diff', path: 'notes.md', oldText: '', newText: 'Hello' }],
      }),
      event({
        toolCallId: 'c',
        kind: 'edit',
        locations: [{ path: 'app.go' }],
        content: [{ type: 'diff', path: 'app.go', oldText: 'a', newText: 'b' }],
      }),
      event({
        toolCallId: 'd',
        kind: 'edit',
        locations: [{ path: 'notes.md' }],
        content: [{ type: 'diff', path: 'notes.md', oldText: 'Hello', newText: 'Hi' }],
      }),
    );
    const files = changedFiles(state);
    expect(files.map(f => f.path)).toEqual(['notes.md', 'app.go']);
    const notes = files[0];

    expect(notes.tools.map(t => t.toolCallId)).toEqual(['b', 'd']);
    expect(notes.diffs).toHaveLength(2);


    expect(notes.action).toBe('modified');
    expect(files[1].action).toBe('modified');
  });

  it('lists a shell edit through its diff even with no announced location', () => {
    const state = feed(
      event({
        toolCallId: 's',
        kind: 'execute',
        content: [{ type: 'diff', path: 'gen/models.go', oldText: 'A', newText: 'B' }],
      }),
    );
    const [file] = changedFiles(state);
    expect(file.path).toBe('gen/models.go');
    expect(file.action).toBe('modified');
  });

  it('ignores reads and searches entirely', () => {
    const state = feed(
      event({ toolCallId: 'r', kind: 'read', locations: [{ path: 'read-only.txt' }] }),
      event({ toolCallId: 's', kind: 'search', locations: [{ path: 'src' }] }),
    );
    expect(changedFiles(state)).toEqual([]);
  });
});

describe('redact', () => {
  it('masks secret-named values and leaves everything else alone', () => {
    const out = redact({
      command: 'gh api user',
      headers: { authorization: 'Bearer abc', 'x-key': 'k' },
      body: { password: 'hunter2', name: 'Ada' },
    });
    expect(out).toEqual({
      command: 'gh api user',
      headers: { authorization: '••••••', 'x-key': '••••••' },
      body: { password: '••••••', name: 'Ada' },
    });
  });
});
