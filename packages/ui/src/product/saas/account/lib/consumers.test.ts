import { describe, expect, it } from 'vitest';
import type { EventConsumer, Instance } from '../../../lib/api/types';
import {
  compareConsumers,
  connectionWord,
  consumerTarget,
  ingestSummary,
  receiverLabel,
  receiverOptions,
  sessionModeLabel,
  sessionSentence,
  sourceLabel,
  targetNameRefusal,
  targetSentence,
} from './consumers';

function instance(overrides: Partial<Instance> & Pick<Instance, 'id' | 'name'>): Instance {
  return {
    account_id: 'acc-1',
    created_at: '2026-08-01T10:00:00Z',
    last_seen_at: '2026-08-10T10:00:00Z',
    revoked_at: null,
    connected: false,
    ...overrides,
  };
}

function consumer(overrides: Partial<EventConsumer> & Pick<EventConsumer, 'id'>): EventConsumer {
  return {
    name: overrides.id,
    source: 'generic',
    instance_id: 'inst-1',
    chain: 'triage',
    session_mode: 'new',
    created_at: '2026-08-10T10:00:00Z',
    ...overrides,
  };
}

describe('sessionModeLabel', () => {
  it('states each mode as the sentence the form offered', () => {
    expect(sessionModeLabel('new')).toBe('Each event starts a fresh session');
    expect(sessionModeLabel('reused')).toBe('Events land in one session that is reused');
  });
});

describe('connectionWord', () => {
  it('tells connected, offline, never-connected and revoked apart', () => {
    expect(connectionWord(instance({ id: 'a', name: 'a', connected: true }))).toBe('connected');
    expect(connectionWord(instance({ id: 'b', name: 'b' }))).toBe('offline');
    expect(connectionWord(instance({ id: 'c', name: 'c', last_seen_at: null }))).toBe(
      'never connected',
    );
    expect(
      connectionWord(instance({ id: 'd', name: 'd', revoked_at: '2026-08-09T10:00:00Z' })),
    ).toBe('revoked');
  });
});

describe('receiverOptions', () => {
  it('excludes revoked machines and puts connected ones first', () => {
    const options = receiverOptions([
      instance({ id: 'inst-z', name: 'zebra' }),
      instance({ id: 'inst-gone', name: 'old-laptop', revoked_at: '2026-08-01T10:00:00Z' }),
      instance({ id: 'inst-m', name: 'mbp', connected: true }),
      instance({ id: 'inst-a', name: 'alpha' }),
    ]);
    expect(options.map(option => option.value)).toEqual(['inst-m', 'inst-a', 'inst-z']);
  });

  it('shows the connection state inside the label', () => {
    const options = receiverOptions([instance({ id: 'inst-m', name: 'mbp', connected: true })]);
    expect(options[0]?.label).toBe('mbp (connected)');
  });

  it('offers nothing when every machine is revoked', () => {
    expect(
      receiverOptions([
        instance({ id: 'inst-gone', name: 'old', revoked_at: '2026-08-01T10:00:00Z' }),
      ]),
    ).toEqual([]);
  });
});

describe('receiverLabel', () => {
  const fleet = [instance({ id: 'inst-m', name: 'mbp', connected: true })];

  it('names the machine with its state', () => {
    expect(receiverLabel('inst-m', fleet)).toBe('mbp (connected)');
  });

  it('falls back to the id when the machine is not in the list', () => {
    expect(receiverLabel('inst-unknown', fleet)).toBe('inst-unknown');
    expect(receiverLabel('inst-m', undefined)).toBe('inst-m');
  });
});

describe('sourceLabel', () => {
  it('states each source as what posts', () => {
    expect(sourceLabel('generic')).toBe('Signed JSON events');
    expect(sourceLabel('form')).toBe('Browser form posts');
  });
});

describe('ingestSummary', () => {
  it('names the first registered origin on a form consumer, with a count for the rest', () => {
    expect(ingestSummary(consumer({ id: 'a' }))).toBe('Accepts signed JSON events');
    expect(
      ingestSummary(
        consumer({ id: 'b', source: 'form', allowed_origins: ['https://contenox.com'] }),
      ),
    ).toBe('Accepts browser form posts from https://contenox.com');
    expect(
      ingestSummary(
        consumer({
          id: 'c',
          source: 'form',
          allowed_origins: [
            'https://contenox.com',
            'https://www.contenox.com',
            'http://localhost:3000',
          ],
        }),
      ),
    ).toBe('Accepts browser form posts from https://contenox.com and 2 more');
    expect(ingestSummary(consumer({ id: 'd', source: 'form' }))).toBe('Accepts browser form posts');
  });
});

describe('compareConsumers', () => {
  it('orders newest first, then by name', () => {
    const rows = [
      consumer({ id: 'b', name: 'beta', created_at: '2026-08-01T10:00:00Z' }),
      consumer({ id: 'c', name: 'alpha', created_at: '2026-08-01T10:00:00Z' }),
      consumer({ id: 'a', name: 'newest', created_at: '2026-08-10T10:00:00Z' }),
    ];
    expect([...rows].sort(compareConsumers).map(row => row.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('consumerTarget', () => {

  it('reads whichever of agent and chain is set', () => {
    expect(consumerTarget(consumer({ id: 'a', chain: 'triage' }))).toEqual({
      kind: 'chain',
      name: 'triage',
    });
    expect(
      consumerTarget(consumer({ id: 'b', chain: undefined, agent_name: 'support-desk' })),
    ).toEqual({ kind: 'agent', name: 'support-desk' });
  });

  it('answers null rather than inventing a target when neither is set', () => {
    expect(consumerTarget(consumer({ id: 'c', chain: undefined }))).toBeNull();
    expect(targetSentence(consumer({ id: 'c', chain: undefined }))).toBe(
      'Runs nothing this listing can name',
    );
  });
});

describe('targetSentence', () => {

  it('names an agent as an agent and a chain as a chain', () => {
    expect(
      targetSentence(consumer({ id: 'a', chain: undefined, agent_name: 'support-desk' })),
    ).toBe('Runs the agent support-desk');
    expect(targetSentence(consumer({ id: 'b', chain: 'triage-alert' }))).toBe(
      'Runs the chain triage-alert',
    );
  });
});

describe('sessionSentence', () => {

  it('names the standing session, and falls back to the mode when there is none', () => {
    expect(
      sessionSentence(consumer({ id: 'a', session_mode: 'reused', session_name: 'alert-triage' })),
    ).toBe('Events land in the session alert-triage');
    expect(sessionSentence(consumer({ id: 'b', session_mode: 'reused' }))).toBe(
      'Events land in one session that is reused',
    );
    expect(
      sessionSentence(consumer({ id: 'c', session_mode: 'new', session_name: 'ignored' })),
    ).toBe('Each event starts a fresh session');
  });
});

describe('targetNameRefusal', () => {
  it('passes an ordinary name and an empty one', () => {
    expect(targetNameRefusal('support-desk', 'agent')).toBeNull();
    expect(targetNameRefusal('   ', 'session')).toBeNull();
  });


  it('refuses a name past the consumer bound, which is the smaller of the two', () => {
    expect(targetNameRefusal('a'.repeat(200), 'agent')).toBeNull();
    expect(targetNameRefusal('a'.repeat(201), 'agent')).toBe(
      'That agent name is too long — at most 200 bytes.',
    );
    expect(targetNameRefusal('a'.repeat(201), 'session')).toBe(
      'That session name is too long — at most 200 bytes.',
    );
  });

  it('refuses a control character, which is what would survive into a log line', () => {
    expect(targetNameRefusal('support\u0007desk', 'agent')).toBe(
      'That agent name carries a control character.',
    );
  });
});
