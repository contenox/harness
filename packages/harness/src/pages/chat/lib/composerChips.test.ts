import type { SessionConfigOption } from '@contenox/acp-client';
import { describe, expect, it } from 'vitest';
import { splitComposerOptions, withLiveModelValues } from './composerChips';

function opt(id: string, extra: Partial<SessionConfigOption> = {}): SessionConfigOption {
  return {
    id,
    name: id,
    type: 'select',
    currentValue: 'a',
    options: [
      { value: 'a', name: 'Alpha' },
      { value: 'b', name: 'Beta' },
    ],
    ...extra,
  };
}

describe('splitComposerOptions', () => {
  it('picks the approval and model options and leaves the rest for overflow', () => {
    const out = splitComposerOptions([
      opt('think'),
      opt('model'),
      opt('hitl-policy'),
      opt('token-limit'),
      opt('workspace-root'),
    ]);
    expect(out.mode?.id).toBe('hitl-policy');
    expect(out.model?.id).toBe('model');
    expect(out.rest.map(o => o.id)).toEqual(['think', 'token-limit']);
  });

  it('recognizes external-agent mode and model by id or category', () => {
    const out = splitComposerOptions([opt('mode'), opt('x', { category: 'model' })]);
    expect(out.mode?.id).toBe('mode');
    expect(out.model?.id).toBe('x');
    expect(out.rest).toEqual([]);
  });

  it('handles an empty list', () => {
    expect(splitComposerOptions([])).toEqual({ mode: undefined, model: undefined, rest: [] });
  });
});

describe('withLiveModelValues', () => {
  const grouped = [
    {
      group: 'deepseek',
      name: 'deepseek',
      options: [{ value: 'connection:d/deepseek-flash', name: 'deepseek-flash' }],
    },
  ];

  it('takes the live catalog into the session model option and keeps its current value', () => {
    const session = [opt('model', { currentValue: 'connection:o/gpt-5.6-luna' }), opt('think')];
    const live = [opt('model', { currentValue: 'connection:o/gpt-5.6-luna', options: grouped })];
    const out = withLiveModelValues(session, live);
    expect(out.find(o => o.id === 'model')?.options).toEqual(grouped);
    expect(out.find(o => o.id === 'model')?.currentValue).toBe('connection:o/gpt-5.6-luna');
    expect(out.find(o => o.id === 'think')).toBe(session[1]);
  });

  it('leaves the session options alone when there is no live catalog', () => {
    const session = [opt('model')];
    expect(withLiveModelValues(session, undefined)).toBe(session);
    expect(withLiveModelValues(session, [])).toBe(session);
  });

  it('does not invent a model option for a session that has none', () => {
    const session = [opt('think')];
    expect(withLiveModelValues(session, [opt('model', { options: grouped })])).toBe(session);
  });
});
