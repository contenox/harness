import { describe, expect, it } from 'vitest';
import {
  axisPatch,
  displayName,
  nestAt,
  parseAxis,
  policyEnvelopeName,
  rawEnvelopes,
  resolveAxis,
  resolveDefaultAction,
  resolveTools,
  slugFor,
} from './permissions';

const envelopes = rawEnvelopes([
  {
    section: 'envelopes',
    name: 'ask_always',
    scope: 'home',
    inLayer: true,
    layer: {},
    revision: 'r',
    effective: {
      default_action: 'approve',
      shell: { grant: 'approve', blacklist: ['mkfs'] },
      files: { read: 'allow', write: { grant: 'approve', deny_paths: ['**/.ssh/**'] } },
      tools: { github: 'approve' },
    },
  },
  {
    section: 'envelopes',
    name: 'default',
    scope: 'home',
    inLayer: true,
    layer: {},
    revision: 'r',
    effective: {
      extends: 'ask_always',
      files: { read: { grant: 'allow', approve_paths: ['**/.env'] } },
      tools: { git: 'allow' },
    },
  },
]);

describe('permission model', () => {
  it('resolves an area from the set itself before its parent', () => {
    expect(resolveAxis(envelopes, 'default', 'files.read')).toEqual({
      value: { grant: 'allow', lists: { approve_paths: ['**/.env'] }, extra: {} },
      from: 'default',
    });
    expect(resolveAxis(envelopes, 'default', 'shell')?.from).toBe('ask_always');
    expect(resolveAxis(envelopes, 'default', 'missions.fire')).toBeUndefined();
    expect(resolveDefaultAction(envelopes, 'default')).toBe('approve');
  });

  it('merges tool patterns with the set winning over its parent', () => {
    const tools = resolveTools(envelopes, 'default');
    expect(tools.get('git')).toEqual({ value: 'allow', from: 'default' });
    expect(tools.get('github')).toEqual({ value: 'approve', from: 'ask_always' });
  });

  it('writes an emptied list as [] instead of dropping it', () => {
    const previous = parseAxis({ grant: 'allow', approve_paths: ['**/.env'] });
    const next = { grant: 'allow' as const, lists: { approve_paths: [] }, extra: {} };
    expect(axisPatch('files.read', next, previous)).toEqual({
      files: { read: { grant: 'allow', approve_paths: [] } },
    });
  });

  it('writes a bare grant when there is nothing else to say', () => {
    expect(axisPatch('missions.fire', { grant: 'deny', lists: {}, extra: {} }, undefined)).toEqual({
      missions: { fire: 'deny' },
    });
  });

  it('keeps timeouts it does not edit', () => {
    const previous = parseAxis({ grant: 'approve', timeout: '30m', on_timeout: 'deny' });
    expect(previous && axisPatch('shell', { ...previous, grant: 'approve' }, previous)).toEqual({
      shell: { grant: 'approve', timeout: '30m', on_timeout: 'deny' },
    });
  });

  it('builds reset patches as nested nulls', () => {
    expect(nestAt(['files', 'read'], null)).toEqual({ files: { read: null } });
  });

  it('names sets for people and files', () => {
    expect(displayName('ask_always')).toBe('Ask always');
    expect(slugFor('Review only', ['review-only'])).toBe('review-only-2');
    expect(slugFor('!!!', [])).toBe('set');
    expect(policyEnvelopeName('hitl-policy-strict.json')).toBe('strict');
    expect(policyEnvelopeName('')).toBeUndefined();
  });
});
