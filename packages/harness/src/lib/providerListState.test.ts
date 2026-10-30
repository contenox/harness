import { describe, expect, it } from 'vitest';
import { getCloudProviderSetup } from './providerCatalog';
import {
  draftFor,
  groupConnections,
  initialProviderListState,
  providerListReducer,
  rollupStatus,
} from './providerListState';
import type { Connection } from './types';

const conn = (patch: Partial<Connection>): Connection => ({
  id: 'c',
  name: 'x',
  providerType: 'ollama',
  baseUrl: '',
  configState: 'configured',
  authState: 'not_required',
  health: 'available',
  secretSource: 'none',
  secretConfigured: false,
  secretPresent: false,
  modelCount: 1,
  ...patch,
});

describe('providerListReducer', () => {
  it('keeps one row open at a time', () => {
    let s = providerListReducer(initialProviderListState, {
      type: 'expand',
      provider: 'openai',
      expanded: true,
    });
    s = providerListReducer(s, { type: 'expand', provider: 'anthropic', expanded: true });
    expect(s.expanded).toBe('anthropic');
    s = providerListReducer(s, { type: 'expand', provider: 'openai', expanded: false });
    expect(s.expanded).toBe('anthropic');
    s = providerListReducer(s, { type: 'expand', provider: 'anthropic', expanded: false });
    expect(s.expanded).toBeNull();
  });

  it('preserves each provider draft across switching rows', () => {
    let s = providerListReducer(initialProviderListState, {
      type: 'draft',
      provider: 'openai',
      values: { apiKey: 'sk-typed' },
    });
    s = providerListReducer(s, { type: 'expand', provider: 'anthropic', expanded: true });
    s = providerListReducer(s, {
      type: 'draft',
      provider: 'anthropic',
      values: { apiKey: 'sk-ant' },
    });
    s = providerListReducer(s, { type: 'expand', provider: 'openai', expanded: true });
    expect(s.drafts.openai).toEqual({ apiKey: 'sk-typed' });
    expect(s.drafts.anthropic).toEqual({ apiKey: 'sk-ant' });
  });

  it('clears only the saved provider draft', () => {
    let s = providerListReducer(initialProviderListState, {
      type: 'draft',
      provider: 'openai',
      values: { apiKey: 'a' },
    });
    s = providerListReducer(s, { type: 'draft', provider: 'gemini', values: { apiKey: 'b' } });
    s = providerListReducer(s, { type: 'clearDraft', provider: 'openai' });
    expect(Object.keys(s.drafts)).toEqual(['gemini']);
    expect(providerListReducer(s, { type: 'clearDraft', provider: 'openai' })).toBe(s);
  });
});

describe('draftFor', () => {
  it('falls back to defaults such as the Ollama address', () => {
    expect(
      draftFor(initialProviderListState, getCloudProviderSetup('ollama')).baseUrl,
    ).toBe('http://127.0.0.1:11434');
  });
  it('returns the stored draft when present', () => {
    const s = providerListReducer(initialProviderListState, {
      type: 'draft',
      provider: 'ollama',
      values: { baseUrl: 'http://other' },
    });
    expect(draftFor(s, getCloudProviderSetup('ollama')).baseUrl).toBe('http://other');
  });
});

describe('groupConnections', () => {
  it('groups by provider type keeping order', () => {
    const map = groupConnections([
      conn({ id: '1', providerType: 'ollama', name: 'ollama' }),
      conn({ id: '2', providerType: 'openai' }),
      conn({ id: '3', providerType: 'ollama', name: 'ollama-2' }),
    ]);
    expect(map.get('ollama')?.map(c => c.id)).toEqual(['1', '3']);
    expect(map.get('openai')?.map(c => c.id)).toEqual(['2']);
  });
});

describe('rollupStatus', () => {
  it('has no dot without connections', () => {
    expect(rollupStatus([])).toBeUndefined();
  });
  it('lets a problem win over healthy connections', () => {
    expect(
      rollupStatus([conn({}), conn({ health: 'unavailable', errorCode: 'unreachable' })]),
    ).toBe('unavailable');
  });
  it('prefers checking over available, and available over unknown', () => {
    expect(rollupStatus([conn({}), conn({ health: 'checking' })])).toBe('checking');
    expect(rollupStatus([conn({}), conn({ health: 'unknown' })])).toBe('available');
    expect(rollupStatus([conn({ health: 'unknown' })])).toBe('unknown');
  });
});
