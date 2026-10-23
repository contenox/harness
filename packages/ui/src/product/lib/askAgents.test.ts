import { describe, expect, it } from 'vitest';
import type { Ask, AskSubscription, EventConsumer, Instance } from './api/types';
import type { AskBoard } from './asks';
import {
  agentAsks,
  agentCatalogue,
  agentInstances,
  agentNameRefusal,
  agentReach,
  agentTriggers,
  byteLength,
  catalogueIsEmpty,
  hasControlCharacter,
  hostAgents,
  hostAsks,
  hostTriggers,
  subscribableAgentName,
} from './askAgents';

function ask(overrides: Partial<Ask> & Pick<Ask, 'ask_id'>): Ask {
  return {
    instance_id: 'inst-1',
    received_at: '2026-08-16T10:00:00Z',
    approvals_required: 1,
    approvals_recorded: 0,
    answered_by_caller: false,
    may_answer: true,
    ...overrides,
  };
}

function board(asks: Ask[], outcomes: AskBoard['outcomes'] = {}): AskBoard {
  return { asks, outcomes };
}

function consumer(overrides: Partial<EventConsumer> & Pick<EventConsumer, 'id'>): EventConsumer {
  return {
    name: overrides.id,
    source: 'generic',
    instance_id: 'inst-1',
    session_mode: 'new',
    created_at: '2026-08-10T10:00:00Z',
    ...overrides,
  };
}

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

const subscription = (agent_name: string): AskSubscription => ({
  agent_name,
  created_at: '2026-08-01T10:00:00Z',
});

describe('agentCatalogue', () => {
  it('folds an agent out of an ask, naming the machine it asked from', () => {
    const catalogue = agentCatalogue({
      board: board([ask({ ask_id: 'a1', agent_name: 'support-desk', instance_id: 'inst-mbp' })]),
      subscriptions: [],
      consumers: [],
    });
    expect(catalogue).toEqual([
      { name: 'support-desk', subscribed: false, hosts: ['inst-mbp'], waiting: 1, triggers: 0 },
    ]);
  });

  it('folds an agent out of a consumer that has never run', () => {
    const catalogue = agentCatalogue({
      board: board([]),
      subscriptions: [],
      consumers: [consumer({ id: 'c1', agent_name: 'finance-bot', instance_id: 'inst-ws' })],
    });
    expect(catalogue).toEqual([
      { name: 'finance-bot', subscribed: false, hosts: ['inst-ws'], waiting: 0, triggers: 1 },
    ]);
  });


  it('unions the machines an agent was met on across both sources', () => {
    const [agent] = agentCatalogue({
      board: board([ask({ ask_id: 'a1', agent_name: 'support-desk', instance_id: 'inst-mbp' })]),
      subscriptions: [],
      consumers: [
        consumer({ id: 'c1', agent_name: 'support-desk', instance_id: 'inst-ws' }),
        consumer({ id: 'c2', agent_name: 'support-desk', instance_id: 'inst-mbp' }),
      ],
    });
    expect(agent.hosts).toEqual(['inst-mbp', 'inst-ws']);
    expect(agent.triggers).toBe(2);
    expect(agent.waiting).toBe(1);
  });

  it('counts only asks that are still open', () => {
    const [agent] = agentCatalogue({
      board: board(
        [
          ask({ ask_id: 'a1', agent_name: 'support-desk' }),
          ask({ ask_id: 'a2', agent_name: 'support-desk' }),
        ],
        { a2: { closure: 'settled-here', decision: 'allow' } },
      ),
      subscriptions: [],
      consumers: [],
    });
    expect(agent.waiting).toBe(1);
  });


  it('keeps a subscribed name that has neither asked nor been configured', () => {
    const catalogue = agentCatalogue({
      board: board([]),
      subscriptions: [subscription('release-bot')],
      consumers: [],
    });
    expect(catalogue).toEqual([
      { name: 'release-bot', subscribed: true, hosts: [], waiting: 0, triggers: 0 },
    ]);
  });


  it('never lists the wildcard as an agent', () => {
    const catalogue = agentCatalogue({
      board: board([]),
      subscriptions: [subscription('*')],
      consumers: [],
    });
    expect(catalogue).toEqual([]);
    expect(catalogueIsEmpty(catalogue)).toBe(true);
  });


  it('ignores an ask that names no agent', () => {
    const catalogue = agentCatalogue({
      board: board([ask({ ask_id: 'a1' }), ask({ ask_id: 'a2', agent_name: '   ' })]),
      subscriptions: [],
      consumers: [],
    });
    expect(catalogue).toEqual([]);
  });

  it('ignores a consumer that runs a chain rather than an agent', () => {
    const catalogue = agentCatalogue({
      board: board([]),
      subscriptions: [],
      consumers: [consumer({ id: 'c1', chain: 'triage-alert' })],
    });
    expect(catalogue).toEqual([]);
  });

  it('orders by name so the list does not move when an ask arrives', () => {
    const catalogue = agentCatalogue({
      board: board([ask({ ask_id: 'a1', agent_name: 'zebra' })]),
      subscriptions: [subscription('alpha')],
      consumers: [consumer({ id: 'c1', agent_name: 'middle' })],
    });
    expect(catalogue.map(agent => agent.name)).toEqual(['alpha', 'middle', 'zebra']);
  });

  it('marks the subscribed ones and leaves the rest alone', () => {
    const catalogue = agentCatalogue({
      board: board([ask({ ask_id: 'a1', agent_name: 'support-desk' })]),
      subscriptions: [subscription('support-desk')],
      consumers: [consumer({ id: 'c1', agent_name: 'finance-bot' })],
    });
    expect(catalogue.map(agent => [agent.name, agent.subscribed])).toEqual([
      ['finance-bot', false],
      ['support-desk', true],
    ]);
  });
});

describe('agentReach', () => {
  it('answers null for a name this app has never met', () => {
    expect(agentReach([], 'nobody')).toBeNull();
  });
});

describe('agentAsks and hostAsks', () => {
  const asks = [
    ask({ ask_id: 'a1', agent_name: 'support-desk', instance_id: 'inst-mbp' }),
    ask({ ask_id: 'a2', agent_name: 'finance-bot', instance_id: 'inst-mbp' }),
    ask({ ask_id: 'a3', agent_name: 'support-desk', instance_id: 'inst-ws' }),
  ];

  it('filters by agent across machines', () => {
    expect(agentAsks(board(asks), 'support-desk').map(a => a.ask_id)).toEqual(['a1', 'a3']);
  });

  it('filters by machine across agents', () => {
    expect(hostAsks(board(asks), 'inst-mbp').map(a => a.ask_id)).toEqual(['a1', 'a2']);
  });


  it('keeps a card that has closed, so it resolves in place here too', () => {
    const closed = board(asks, { a1: { closure: 'settled-here', decision: 'allow' } });
    expect(agentAsks(closed, 'support-desk').map(a => a.ask_id)).toEqual(['a1', 'a3']);
  });
});

describe('agentTriggers and hostTriggers', () => {
  const consumers = [
    consumer({ id: 'c1', agent_name: 'support-desk', instance_id: 'inst-mbp' }),
    consumer({ id: 'c2', chain: 'triage', instance_id: 'inst-mbp' }),
    consumer({ id: 'c3', agent_name: 'support-desk', instance_id: 'inst-ws' }),
  ];

  it('selects the consumers that fire one agent', () => {
    expect(agentTriggers(consumers, 'support-desk').map(c => c.id)).toEqual(['c1', 'c3']);
  });


  it('selects every consumer delivering to one machine, agent or chain', () => {
    expect(hostTriggers(consumers, 'inst-mbp').map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('treats a missing listing as none rather than throwing', () => {
    expect(agentTriggers(undefined, 'support-desk')).toEqual([]);
    expect(hostTriggers(undefined, 'inst-mbp')).toEqual([]);
  });
});

describe('hostAgents', () => {

  it('counts only what is on that machine', () => {
    const agents = hostAgents(
      {
        board: board([
          ask({ ask_id: 'a1', agent_name: 'support-desk', instance_id: 'inst-mbp' }),
          ask({ ask_id: 'a2', agent_name: 'support-desk', instance_id: 'inst-ws' }),
        ]),
        subscriptions: [subscription('support-desk')],
        consumers: [consumer({ id: 'c1', agent_name: 'support-desk', instance_id: 'inst-ws' })],
      },
      'inst-mbp',
    );
    expect(agents).toEqual([
      { name: 'support-desk', subscribed: true, hosts: ['inst-mbp'], waiting: 1, triggers: 0 },
    ]);
  });


  it('leaves out an agent with nothing on that machine', () => {
    const agents = hostAgents(
      { board: board([]), subscriptions: [subscription('release-bot')], consumers: [] },
      'inst-mbp',
    );
    expect(agents).toEqual([]);
  });
});

describe('agentInstances', () => {
  const fleet = [
    instance({ id: 'inst-ws', name: 'workstation' }),
    instance({ id: 'inst-mbp', name: 'studio-mbp', connected: true }),
  ];

  it('resolves ids to machines, connected first then alphabetical', () => {
    const { known, unknown } = agentInstances(['inst-ws', 'inst-mbp'], fleet);
    expect(known.map(i => i.name)).toEqual(['studio-mbp', 'workstation']);
    expect(unknown).toBe(0);
  });


  it('counts ids the fleet listing does not know instead of rendering them', () => {
    const { known, unknown } = agentInstances(['inst-mbp', 'inst-gone'], fleet);
    expect(known.map(i => i.id)).toEqual(['inst-mbp']);
    expect(unknown).toBe(1);
  });

  it('treats a missing fleet listing as knowing nothing', () => {
    expect(agentInstances(['inst-mbp'], undefined)).toEqual({ known: [], unknown: 1 });
  });
});

describe('subscribableAgentName', () => {
  it('trims and accepts an ordinary name', () => {
    expect(subscribableAgentName('  support-desk ')).toBe('support-desk');
  });

  it('refuses nothing typed', () => {
    expect(subscribableAgentName('   ')).toBeNull();
    expect(agentNameRefusal('   ')).toBeNull();
  });


  it('refuses the wildcard as a typed name, and says why', () => {
    expect(subscribableAgentName('*')).toBeNull();
    expect(agentNameRefusal('*')).toBe('Use the control above to be shown every agent.');
  });

  it('refuses a name past the relay byte bound', () => {
    const long = 'a'.repeat(257);
    expect(subscribableAgentName(long)).toBeNull();
    expect(agentNameRefusal(long)).toBe('That agent name is too long.');
  });


  it('measures the bound in bytes rather than characters', () => {
    const wide = 'ä'.repeat(200);
    expect(byteLength(wide)).toBe(400);
    expect(subscribableAgentName(wide)).toBeNull();
  });

  it('refuses a control character, which is the only thing the relay rejects a name for', () => {
    const name = 'support\u0007desk';
    expect(hasControlCharacter(name)).toBe(true);
    expect(subscribableAgentName(name)).toBeNull();
    expect(agentNameRefusal(name)).toBe('That agent name carries a control character.');
  });

  it('accepts a name a human would actually type, including spaces and unicode', () => {
    expect(subscribableAgentName('Kundendienst — Erstattungen')).toBe(
      'Kundendienst — Erstattungen',
    );
    expect(hasControlCharacter('Kundendienst — Erstattungen')).toBe(false);
  });
});
