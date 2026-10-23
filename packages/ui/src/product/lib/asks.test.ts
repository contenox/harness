import { describe, expect, it } from 'vitest';
import type { Account, AnswerAskResponse, Ask, AskStreamEvent, Instance } from './api/types';
import {
  EMPTY_ASK_BOARD,
  adoptAsks,
  answeringBlock,
  applyAnswer,
  applyAskEvent,
  approverRoleLabel,
  askHeadline,
  askKind,
  askMachineName,
  asksWaitingOnCaller,
  openAsks,
  outcomeIsRefusal,
  outcomeSentence,
  quorum,
  subscribedAgents,
  subscribesToNothing,
} from './asks';

function ask(overrides: Partial<Ask> & Pick<Ask, 'ask_id'>): Ask {
  return {
    instance_id: 'inst-1',
    agent_name: 'refunds',
    received_at: '2026-08-16T10:00:00Z',
    approvals_required: 1,
    approvals_recorded: 0,
    answered_by_caller: false,
    may_answer: true,
    ...overrides,
  };
}

function published(one: Ask): AskStreamEvent {
  return { type: 'ask.published', ask: one };
}

function resolved(askID: string, reason?: string): AskStreamEvent {
  return { type: 'ask.resolved', ask_id: askID, reason };
}

function answer(overrides: Partial<AnswerAskResponse> & Pick<AnswerAskResponse, 'ask_id'>) {
  const response: AnswerAskResponse = {
    status: 'settled',
    approvals_required: 1,
    approvals_recorded: 1,
    ...overrides,
  };
  return response;
}

describe('applyAskEvent', () => {
  it('puts a published ask on the board, newest first', () => {
    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAskEvent(
      board,
      published(ask({ ask_id: 'b', received_at: '2026-08-16T11:00:00Z' })),
    );
    expect(board.asks.map(one => one.ask_id)).toEqual(['b', 'a']);
  });

  it('replaces a republished ask rather than showing it twice', () => {


    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAskEvent(
      board,
      published(ask({ ask_id: 'a', approvals_required: 2, approvals_recorded: 1 })),
    );
    expect(board.asks).toHaveLength(1);
    expect(board.asks[0].approvals_recorded).toBe(1);
  });

  it('closes a card in place when the host retracts the ask', () => {
    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAskEvent(board, resolved('a', 'answered'));


    expect(board.asks).toHaveLength(1);
    expect(board.outcomes.a).toEqual({ closure: 'answered' });
    expect(openAsks(board)).toEqual([]);
  });

  it('treats a reason it does not recognise as answered rather than leaving the card live', () => {
    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAskEvent(board, resolved('a', 'something-new'));
    expect(board.outcomes.a.closure).toBe('answered');
  });

  it('reopens a card the host publishes again after closing it', () => {
    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAskEvent(board, resolved('a', 'superseded'));
    board = applyAskEvent(board, published(ask({ ask_id: 'a' })));
    expect(board.outcomes.a).toBeUndefined();
    expect(openAsks(board)).toHaveLength(1);
  });

  it('ignores a resolution for an ask that was never on screen', () => {
    const board = applyAskEvent(EMPTY_ASK_BOARD, resolved('ghost', 'answered'));
    expect(board).toEqual(EMPTY_ASK_BOARD);
  });

  it('keeps the confirmation this browser produced when the host retracts what it settled', () => {




    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAnswer(board, answer({ ask_id: 'a', decision: 'allow' }));
    board = applyAskEvent(board, resolved('a', 'answered'));
    expect(board.outcomes.a).toEqual({ closure: 'settled-here', decision: 'allow' });
    expect(outcomeSentence(board.outcomes.a)).toBe('Allowed. The agent is going ahead.');
  });

  it('lets an expiry replace a confirmation it contradicts', () => {


    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAnswer(board, answer({ ask_id: 'a', decision: 'allow' }));
    board = applyAskEvent(board, resolved('a', 'expired'));
    expect(board.outcomes.a).toEqual({ closure: 'expired' });
  });

  it('still closes a pair review this person had only part-answered', () => {


    let board = applyAskEvent(
      EMPTY_ASK_BOARD,
      published(ask({ ask_id: 'a', approvals_required: 2 })),
    );
    board = applyAnswer(
      board,
      answer({
        ask_id: 'a',
        status: 'recorded',
        decision: 'allow',
        approvals_required: 2,
        approvals_recorded: 1,
      }),
    );
    board = applyAskEvent(board, resolved('a', 'answered'));
    expect(board.outcomes.a).toEqual({ closure: 'answered' });
  });
});

describe('adoptAsks', () => {
  it('keeps a card this browser has an outcome for, even once the relay stops listing it', () => {



    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAnswer(board, answer({ ask_id: 'a', decision: 'allow' }));
    board = adoptAsks(board, []);
    expect(board.asks.map(one => one.ask_id)).toEqual(['a']);
    expect(board.outcomes.a.closure).toBe('settled-here');
  });

  it('drops a card with no outcome once the relay stops listing it', () => {
    const board = adoptAsks(EMPTY_ASK_BOARD, [ask({ ask_id: 'a' })]);
    expect(adoptAsks(board, []).asks).toEqual([]);
  });

  it('forgets the outcome of an ask the relay is listing as open again', () => {
    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAskEvent(board, resolved('a', 'answered'));
    board = adoptAsks(board, [ask({ ask_id: 'a' })]);
    expect(board.outcomes.a).toBeUndefined();
  });
});

describe('applyAnswer', () => {
  it('leaves a pair-reviewed ask open on the first answer, with the tally moved', () => {
    let board = applyAskEvent(
      EMPTY_ASK_BOARD,
      published(ask({ ask_id: 'a', approvals_required: 2 })),
    );
    board = applyAnswer(
      board,
      answer({
        ask_id: 'a',
        status: 'recorded',
        decision: 'allow',
        approvals_required: 2,
        approvals_recorded: 1,
      }),
    );
    expect(openAsks(board)).toHaveLength(1);
    expect(board.asks[0].answered_by_caller).toBe(true);
    expect(board.asks[0].approvals_recorded).toBe(1);
  });

  it('closes the card when the answer settled it', () => {
    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAnswer(board, answer({ ask_id: 'a', status: 'settled', decision: 'deny' }));
    expect(board.outcomes.a).toEqual({ closure: 'settled-here', decision: 'deny' });
    expect(outcomeSentence(board.outcomes.a)).toBe('Denied. The agent has been told.');
    expect(outcomeIsRefusal(board.outcomes.a)).toBe(true);
  });

  it('does not guess a decision the relay did not name', () => {
    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAnswer(board, answer({ ask_id: 'a', status: 'settled' }));
    expect(outcomeSentence(board.outcomes.a)).toBe('Your answer reached the machine.');
  });

  it('closes the card as a success when somebody else settled it first', () => {
    let board = applyAskEvent(EMPTY_ASK_BOARD, published(ask({ ask_id: 'a' })));
    board = applyAnswer(
      board,
      answer({ ask_id: 'a', status: 'already_decided', decision: 'allow' }),
    );
    expect(board.outcomes.a.closure).toBe('already-decided');
    expect(outcomeSentence(board.outcomes.a)).toBe('Someone else answered this first.');
    expect(outcomeIsRefusal(board.outcomes.a)).toBe(false);
  });
});

describe('asksWaitingOnCaller', () => {
  it('leaves out an approval this person may not give', () => {



    const board = adoptAsks(EMPTY_ASK_BOARD, [
      ask({ ask_id: 'mine' }),
      ask({ ask_id: 'owners-only', may_answer: false }),
    ]);
    expect(openAsks(board)).toHaveLength(2);
    expect(asksWaitingOnCaller(board).map(one => one.ask_id)).toEqual(['mine']);
  });

  it('stops counting a pair review this person has already answered', () => {
    let board = adoptAsks(EMPTY_ASK_BOARD, [ask({ ask_id: 'a', approvals_required: 2 })]);
    expect(asksWaitingOnCaller(board)).toHaveLength(1);
    board = applyAnswer(
      board,
      answer({
        ask_id: 'a',
        status: 'recorded',
        decision: 'allow',
        approvals_required: 2,
        approvals_recorded: 1,
      }),
    );

    expect(openAsks(board)).toHaveLength(1);
    expect(asksWaitingOnCaller(board)).toEqual([]);
  });

  it('counts nothing while the account itself is refused, however answerable the ask looks', () => {




    const board = adoptAsks(EMPTY_ASK_BOARD, [ask({ ask_id: 'a' }), ask({ ask_id: 'b' })]);
    expect(asksWaitingOnCaller(board)).toHaveLength(2);
    expect(asksWaitingOnCaller(board, 'This account is suspended.')).toEqual([]);
  });

  it('counts normally for an account with nothing against it, and while one is still being read', () => {
    const board = adoptAsks(EMPTY_ASK_BOARD, [ask({ ask_id: 'a' })]);
    for (const block of [undefined, null, '', '   ']) {
      expect(asksWaitingOnCaller(board, block)).toHaveLength(1);
    }
  });
});

describe('askKind', () => {
  it('reads a gated tool call as an approval', () => {
    expect(askKind(ask({ ask_id: 'a', tools_name: 'payments', tool_name: 'issue_refund' }))).toBe(
      'approval',
    );
    expect(askKind(ask({ ask_id: 'a', policy_name: 'payments' }))).toBe('approval');
  });

  it('reads the runtime attention ask as a question, which is what it publishes', () => {



    expect(
      askKind(
        ask({
          ask_id: 'a',
          mission_id: 'msn-1',
          tools_name: 'mission',
          tool_name: 'mission_ask_attention',
          summary: 'The customer is asking for a full refund on a used item. Do we?',
        }),
      ),
    ).toBe('question');
  });

  it('does not require a mission, because the runtime predicate does not', () => {


    expect(
      askKind(ask({ ask_id: 'a', tools_name: 'mission', tool_name: 'mission_ask_attention' })),
    ).toBe('question');
  });

  it('reads a mission ask that DOES gate a tool as an approval', () => {
    expect(
      askKind(
        ask({
          ask_id: 'a',
          mission_id: 'msn-1',
          tools_name: 'payments',
          tool_name: 'issue_refund',
        }),
      ),
    ).toBe('approval');
  });

  it('needs BOTH names, so neither half alone flips the control', () => {
    expect(askKind(ask({ ask_id: 'a', tools_name: 'mission', tool_name: 'mission_finish' }))).toBe(
      'approval',
    );
    expect(
      askKind(ask({ ask_id: 'a', tools_name: 'payments', tool_name: 'mission_ask_attention' })),
    ).toBe('approval');
  });

  it('falls back to an approval for an ask that names nothing', () => {
    expect(askKind(ask({ ask_id: 'a' }))).toBe('approval');
    expect(askKind(ask({ ask_id: 'a', mission_id: 'msn-1' }))).toBe('approval');
  });
});

describe('answeringBlock', () => {
  function account(overrides: Partial<Account>): Account {
    return {
      id: 'acct-1',
      slug: 'acme',
      name: 'Acme',
      plan: 'pro',
      subscription_source: 'stripe',
      subscription_state: 'active',
      active_instances: 1,
      active_members: 2,
      invited_seats_used: 1,
      pending_invites: 0,
      can_subscribe: false,
      suspended: false,
      consents: [],
      ...overrides,
    };
  }

  it('offers the controls on a healthy account', () => {
    expect(answeringBlock(account({}))).toBeNull();
  });

  it('blocks on on_hold, which askplane.standingRefusal refuses with a 403', () => {
    const block = answeringBlock(account({ subscription_state: 'on_hold' }));
    expect(block).not.toBeNull();
    expect(block).toContain('billing');
  });

  it('tells an owner to update the card, because the portal is theirs to open', () => {
    for (const role of ['tenant_owner', 'tenant_admin']) {
      expect(answeringBlock(account({ subscription_state: 'on_hold' }), role)).toContain(
        'Update the card in billing',
      );
    }
  });

  it('does not send a member at a portal that refuses them', () => {


    for (const role of ['tenant_user', undefined]) {
      const block = answeringBlock(account({ subscription_state: 'on_hold' }), role);
      expect(block).toContain('An owner or admin has to update the card');
      expect(block).not.toContain('Update the card in billing to answer');
    }
  });

  it('blocks a suspended account, and says nothing about billing — that is not the remedy', () => {
    const block = answeringBlock(account({ suspended: true }));
    expect(block).not.toBeNull();
    expect(block).toContain('suspended');
    expect(block).not.toContain('billing');
  });

  it('does NOT block grace: entitlement is kept through the retry window on purpose', () => {
    expect(answeringBlock(account({ subscription_state: 'grace' }))).toBeNull();
  });

  it('does not block the other lapsed states, which standingRefusal does not refuse', () => {
    for (const state of ['none', 'paused', 'expired', 'canceled'] as const) {
      expect(answeringBlock(account({ subscription_state: state }))).toBeNull();
    }
  });

  it('offers the controls while the account is still being read', () => {


    expect(answeringBlock(undefined)).toBeNull();
  });
});

describe('askHeadline', () => {
  it('prefers the summary, which is the only field written for a human', () => {
    expect(
      askHeadline(ask({ ask_id: 'a', summary: 'Refund €240 to order 7741', tool_name: 'refund' })),
    ).toBe('Refund €240 to order 7741');
  });

  it('falls back to the tool, and to the id, rather than rendering blank', () => {
    expect(askHeadline(ask({ ask_id: 'a', summary: '   ', tool_name: 'refund' }))).toBe('refund');
    expect(askHeadline(ask({ ask_id: 'ask-77' }))).toBe('ask-77');
  });
});

describe('quorum', () => {
  it('says nothing for an ordinary single-approver ask', () => {
    expect(quorum(ask({ ask_id: 'a', approvals_required: 1 }))).toBeNull();

    expect(quorum(ask({ ask_id: 'a', approvals_required: 0 }))).toBeNull();
  });

  it('reports the pair review, clamped so the tally never overruns the rule', () => {
    expect(quorum(ask({ ask_id: 'a', approvals_required: 2, approvals_recorded: 1 }))).toEqual({
      required: 2,
      recorded: 1,
    });
    expect(quorum(ask({ ask_id: 'a', approvals_required: 2, approvals_recorded: 5 }))).toEqual({
      required: 2,
      recorded: 2,
    });
  });
});

describe('askMachineName', () => {
  const machines: Instance[] = [
    {
      id: 'inst-1',
      name: 'billing-runner',
      account_id: 'acc-1',
      created_at: '2026-08-01T10:00:00Z',
      last_seen_at: '2026-08-16T10:00:00Z',
      revoked_at: null,
      connected: true,
    },
  ];

  it('names the machine the team named', () => {
    expect(askMachineName('inst-1', machines)).toBe('billing-runner');
  });

  it('falls back to the id rather than rendering no machine at all', () => {
    expect(askMachineName('inst-new', machines)).toBe('inst-new');
    expect(askMachineName('inst-1', undefined)).toBe('inst-1');
  });
});

describe('approverRoleLabel', () => {
  it('states the relay roles as words and passes an unknown one through', () => {
    expect(approverRoleLabel('tenant_owner')).toBe('an owner');
    expect(approverRoleLabel('tenant_admin')).toBe('an admin or owner');
    expect(approverRoleLabel('tenant_user')).toBe('a member');
    expect(approverRoleLabel('auditor')).toBe('auditor');
  });
});

describe('subscribedAgents', () => {
  it('separates the wildcard from the named agents', () => {
    const agents = subscribedAgents([
      { agent_name: 'refunds', created_at: '2026-08-16T10:00:00Z' },
      { agent_name: '*', created_at: '2026-08-16T09:00:00Z' },
      { agent_name: 'billing', created_at: '2026-08-16T08:00:00Z' },
    ]);
    expect(agents.all).toBe(true);
    expect(agents.named).toEqual(['billing', 'refunds']);
    expect(subscribesToNothing(agents)).toBe(false);
  });

  it('reports a member who would be shown nothing', () => {
    expect(subscribesToNothing(subscribedAgents([]))).toBe(true);
  });
});
