import { describe, expect, it } from 'vitest';
import type { PermissionToolCall, RequestPermissionRequest } from '@contenox/acp-client';
import {
  ARGUMENT_MAX_CHARS,
  ARGUMENT_MAX_ENTRIES,
  ARGUMENT_MAX_LINES,
  permissionEvidence,
  permissionMetaFrom,
} from './permissionRequest';

function request(overrides: Partial<RequestPermissionRequest>): RequestPermissionRequest {
  return {
    sessionId: 'sess-1',
    toolCall: { toolCallId: 'call-1' },
    options: [],
    ...overrides,
  };
}

function toolCall(overrides: Partial<PermissionToolCall>): PermissionToolCall {
  return { toolCallId: 'call-1', ...overrides };
}

describe('permissionMetaFrom', () => {
  it('reads the whole approval envelope off the request', () => {
    const meta = permissionMetaFrom(
      request({
        _meta: {
          policyName: 'strict.yaml',
          policyPath: '/home/ada/.contenox/strict.yaml',
          matchedRule: 3,
          detail: 'rm appears in the command line',
          mayCall: ['fs.write', 'shell.exec'],
          mayCallDeclared: false,
          askId: 'ask-9f2',
          expiresAt: '2026-12-24T17:45:00Z',
          onTimeout: 'deny',
          recoveryCommand: 'contenox approvals respond ask-9f2 --approve|--deny',
        },
      }),
    );
    expect(meta.policyName).toBe('strict.yaml');
    expect(meta.matchedRule).toBe(3);
    expect(meta.mayCall).toEqual(['fs.write', 'shell.exec']);
    expect(meta.mayCallDeclared).toBe(false);
    expect(meta.recoveryCommand).toBe('contenox approvals respond ask-9f2 --approve|--deny');
  });

  it('falls back to the tool call copy per field, since the runtime writes both from one struct', () => {
    const meta = permissionMetaFrom(
      request({
        _meta: { policyName: 'outer.yaml' },
        toolCall: toolCall({ _meta: { policyName: 'inner.yaml', askId: 'ask-inner' } }),
      }),
    );
    expect(meta.policyName).toBe('outer.yaml');
    expect(meta.askId).toBe('ask-inner');
  });

  it('is empty, not thrown, for no envelope and for a malformed one', () => {
    const empty = permissionMetaFrom(request({}));
    expect(empty.policyName).toBe('');
    expect(empty.matchedRule).toBeNull();
    expect(empty.mayCall).toEqual([]);
    expect(empty.mayCallDeclared).toBeNull();

    const junk = permissionMetaFrom(
      request({
        _meta: {
          policyName: 42,
          matchedRule: 'three',
          mayCall: 'fs.write',
          mayCallDeclared: 'yes',
          expiresAt: null,
        } as unknown as Record<string, unknown>,
      }),
    );
    expect(junk.policyName).toBe('');
    expect(junk.matchedRule).toBeNull();
    expect(junk.mayCall).toEqual([]);
    expect(junk.mayCallDeclared).toBeNull();
    expect(junk.expiresAt).toBe('');
  });


  it('keeps rule zero', () => {
    expect(permissionMetaFrom(request({ _meta: { matchedRule: 0 } })).matchedRule).toBe(0);
  });
});

describe('permissionEvidence: diffs', () => {
  it('reads a diff block with both texts and a path', () => {
    const evidence = permissionEvidence(
      toolCall({
        content: [
          { type: 'diff', path: 'src/lib/countdown.ts', oldText: 'a\n', newText: 'b\n' },
        ],
      }),
    );
    expect(evidence.diffs).toEqual([
      { path: 'src/lib/countdown.ts', oldText: 'a\n', newText: 'b\n' },
    ]);
  });

  it('drops a diff of nothing and a diff with no file, which would draw an empty frame', () => {
    const evidence = permissionEvidence(
      toolCall({
        content: [
          { type: 'diff', path: '', oldText: 'a', newText: 'b' },
          { type: 'diff', path: 'src/x.ts', oldText: 'same', newText: 'same' },
          { type: 'diff', path: 'src/y.ts' },
        ],
      }),
    );
    expect(evidence.diffs).toEqual([]);
  });

  it('takes a pure addition — an empty oldText is a new file, not a missing field', () => {
    const evidence = permissionEvidence(
      toolCall({ content: [{ type: 'diff', path: 'new.ts', newText: 'hello\n' }] }),
    );
    expect(evidence.diffs).toEqual([{ path: 'new.ts', oldText: '', newText: 'hello\n' }]);
  });
});

describe('permissionEvidence: the summary and whether the arguments were sent', () => {
  it('reports arguments as absent when only a summary arrived', () => {
    const evidence = permissionEvidence(
      toolCall({
        content: [{ type: 'content', content: { type: 'text', text: '/workspace/main.go' } }],
      }),
    );
    expect(evidence.summary).toBe('/workspace/main.go');
    expect(evidence.argumentsSent).toBe(false);
    expect(evidence.args).toEqual([]);
  });

  it('reports arguments as sent when rawInput is there, even empty', () => {
    expect(permissionEvidence(toolCall({ rawInput: {} })).argumentsSent).toBe(true);
    expect(permissionEvidence(toolCall({})).argumentsSent).toBe(false);
  });
});

describe('permissionEvidence: arguments', () => {
  it('keeps a shell command line whole and in wire key order', () => {
    const evidence = permissionEvidence(
      toolCall({ rawInput: { args: ['-lc', 'rm -rf build'], command: 'bash' } }),
    );
    expect(evidence.args.map(a => a.key)).toEqual(['args', 'command']);
    expect(evidence.args[1]).toEqual({ key: 'command', value: 'bash', hiddenLines: 0 });
  });

  it('does not quote a string value into JSON — the command line is the decision', () => {
    const evidence = permissionEvidence(toolCall({ rawInput: { command: 'rm -rf /tmp/x' } }));
    expect(evidence.args[0].value).toBe('rm -rf /tmp/x');
  });

  it('clamps a value taller than the cap and says how many lines it withheld', () => {
    const body = Array.from({ length: 400 }, (_, i) => `line ${i}`).join('\n');
    const evidence = permissionEvidence(toolCall({ rawInput: { content: body } }));
    expect(evidence.args[0].value.split('\n')).toHaveLength(ARGUMENT_MAX_LINES);
    expect(evidence.args[0].hiddenLines).toBe(400 - ARGUMENT_MAX_LINES);
  });

  it('clamps one enormous single line too, and still reports something withheld', () => {
    const evidence = permissionEvidence(toolCall({ rawInput: { blob: 'x'.repeat(50_000) } }));
    expect(evidence.args[0].value).toHaveLength(ARGUMENT_MAX_CHARS);
    expect(evidence.args[0].hiddenLines).toBe(1);
  });

  it('caps the number of keys and reports the remainder', () => {
    const many = Object.fromEntries(
      Array.from({ length: ARGUMENT_MAX_ENTRIES + 5 }, (_, i) => [`k${i}`, i]),
    );
    const evidence = permissionEvidence(toolCall({ rawInput: many }));
    expect(evidence.args).toHaveLength(ARGUMENT_MAX_ENTRIES);
    expect(evidence.hiddenArguments).toBe(5);
  });

  it('shows a non-object rawInput unkeyed rather than dropping it', () => {
    const evidence = permissionEvidence(toolCall({ rawInput: ['a', 'b'] }));
    expect(evidence.args).toHaveLength(1);
    expect(evidence.args[0].key).toBe('');
    expect(evidence.args[0].value).toContain('"a"');
  });
});
