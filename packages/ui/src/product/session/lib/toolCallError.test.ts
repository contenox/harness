import { describe, expect, it } from 'vitest';
import { toolCallError } from './toolCallError';

describe('toolCallError', () => {
  it('prefers a standard ACP text content block', () => {
    expect(
      toolCallError({
        status: 'failed',
        content: [{ type: 'content', content: { type: 'text', text: 'policy denied this call' } }],
        meta: { error: 'ignored meta' },
      }),
    ).toBe('policy denied this call');
  });

  it('falls back to _meta.error when no content block carries text', () => {
    expect(
      toolCallError({
        status: 'failed',
        content: [{ type: 'diff', path: 'a.txt' }],
        meta: { error: 'the arguments never reached the runtime' },
      }),
    ).toBe('the arguments never reached the runtime');
  });

  it('uses the raw output of a failed call as a last resort', () => {
    expect(toolCallError({ status: 'failed', rawOutput: '{"error":"boom"}' })).toBe('{"error":"boom"}');
  });

  it('does not treat a successful call with an output as an error', () => {
    expect(toolCallError({ status: 'completed', rawOutput: 'all good' })).toBeNull();
  });

  it.each(['completed', 'in_progress', 'pending'] as const)(
    'does not treat a text content block on a %s call as an error',
    status => {
      expect(
        toolCallError({
          status,
          content: [{ type: 'content', content: { type: 'text', text: 'build output' } }],
        }),
      ).toBeNull();
    },
  );

  it('does not treat _meta.error on a non-failed call as an error', () => {
    expect(toolCallError({ status: 'completed', meta: { error: 'stale' } })).toBeNull();
    expect(toolCallError({ status: 'in_progress', meta: { error: 'stale' } })).toBeNull();
  });

  it('returns the text of a failed call', () => {
    expect(
      toolCallError({
        status: 'failed',
        content: [{ type: 'content', content: { type: 'text', text: 'exit code 1' } }],
      }),
    ).toBe('exit code 1');
  });

  it('ignores blank and non-string meta values', () => {
    expect(toolCallError({ status: 'failed', meta: { error: '   ' } })).toBeNull();
    expect(toolCallError({ status: 'failed', meta: { error: { code: 1 } } })).toBeNull();
  });

  it('returns null when there is nothing to show', () => {
    expect(toolCallError({ status: 'pending' })).toBeNull();
    expect(toolCallError({})).toBeNull();
  });
});
