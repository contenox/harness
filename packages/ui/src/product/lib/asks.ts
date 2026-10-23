
import type {
  Account,
  AnswerAskResponse,
  Ask,
  AskDecision,
  AskStreamEvent,
  AskSubscription,
  Instance,
} from './api/types';


export const ALL_AGENTS = '*';

/**
 * Why an ask on screen is no longer open.
 */
export type AskClosure = 'answered' | 'expired' | 'superseded' | 'settled-here' | 'already-decided';

/**
 * How an ask closed, with the decision when this browser knows one.
 */
export interface AskOutcome {
  closure: AskClosure;
  decision?: AskDecision;
}

/**
 * The inbox as one value: the asks being shown, and the outcome of the ones that have closed while somebody was looking at them.
 */
export interface AskBoard {
  asks: Ask[];
  outcomes: Record<string, AskOutcome>;
}

export const EMPTY_ASK_BOARD: AskBoard = { asks: [], outcomes: {} };


function byNewest(a: Ask, b: Ask): number {
  const at = Date.parse(a.received_at);
  const bt = Date.parse(b.received_at);
  if (at !== bt && !Number.isNaN(at) && !Number.isNaN(bt)) return bt - at;
  return a.ask_id.localeCompare(b.ask_id);
}

/**
 * Replaces the board's asks with a full read, keeping any card whose outcome this browser produced.
 */
export function adoptAsks(board: AskBoard, asks: Ask[]): AskBoard {
  const present = new Set(asks.map(ask => ask.ask_id));
  const kept = board.asks.filter(ask => !present.has(ask.ask_id) && ask.ask_id in board.outcomes);
  const outcomes: Record<string, AskOutcome> = {};
  for (const ask of kept) outcomes[ask.ask_id] = board.outcomes[ask.ask_id];
  return { asks: [...asks, ...kept].sort(byNewest), outcomes };
}

/**
 * Folds one stream event into the board.
 */
export function applyAskEvent(board: AskBoard, event: AskStreamEvent): AskBoard {
  if (event.type === 'ask.published') {
    const ask = event.ask;
    if (ask === undefined || ask.ask_id === '') return board;
    const asks = [...board.asks.filter(held => held.ask_id !== ask.ask_id), ask].sort(byNewest);
    const outcomes = { ...board.outcomes };
    delete outcomes[ask.ask_id];
    return { asks, outcomes };
  }

  const askID = event.ask_id;
  if (askID === undefined || askID === '') return board;
  if (!board.asks.some(ask => ask.ask_id === askID)) return board;
  const closure = closureFor(event.reason);
  if (board.outcomes[askID] !== undefined && !contradictsAnAnswer(closure)) return board;
  return { asks: board.asks, outcomes: { ...board.outcomes, [askID]: closure } };
}


function contradictsAnAnswer(outcome: AskOutcome): boolean {
  return outcome.closure === 'expired' || outcome.closure === 'superseded';
}


function closureFor(reason: string | undefined): AskOutcome {
  switch (reason) {
    case 'expired':
      return { closure: 'expired' };
    case 'superseded':
      return { closure: 'superseded' };
    default:
      return { closure: 'answered' };
  }
}

/**
 * Folds this browser's own answer into the board.
 */
export function applyAnswer(board: AskBoard, response: AnswerAskResponse): AskBoard {
  const asks = board.asks.map(ask =>
    ask.ask_id === response.ask_id
      ? {
          ...ask,
          answered_by_caller: true,
          approvals_required: response.approvals_required,
          approvals_recorded: response.approvals_recorded,
        }
      : ask,
  );
  if (response.status === 'recorded') return { asks, outcomes: board.outcomes };
  const closure: AskClosure = response.status === 'settled' ? 'settled-here' : 'already-decided';
  return {
    asks,
    outcomes: { ...board.outcomes, [response.ask_id]: { closure, decision: response.decision } },
  };
}

/**
 * The asks still open — nobody has settled them, here or anywhere else.
 */
export function openAsks(board: AskBoard): Ask[] {
  return board.asks.filter(ask => board.outcomes[ask.ask_id] === undefined);
}

/**
 * The asks waiting on THIS person — what the bar counts.
 */
export function asksWaitingOnCaller(board: AskBoard, block?: string | null): Ask[] {
  if (block !== undefined && block !== null && block.trim() !== '') return [];
  return openAsks(board).filter(ask => ask.may_answer && !ask.answered_by_caller);
}


const ATTENTION_TOOLS_NAME = 'mission';
const ATTENTION_TOOL_NAME = 'mission_ask_attention';

/**
 * What kind of question an ask is.
 */
export type AskKind = 'approval' | 'question';

export function askKind(ask: Ask): AskKind {
  const tools = (ask.tools_name ?? '').trim();
  const tool = (ask.tool_name ?? '').trim();
  return tools === ATTENTION_TOOLS_NAME && tool === ATTENTION_TOOL_NAME ? 'question' : 'approval';
}

/**
 * The line at the top of a card: what is about to happen, in the host's own words.
 */
export function askHeadline(ask: Ask): string {
  const summary = (ask.summary ?? '').trim();
  if (summary !== '') return summary;
  const tool = (ask.tool_name ?? '').trim();
  if (tool !== '') return tool;
  return ask.ask_id;
}

/**
 * How many people this ask needs, and how many it has.
 */
export function quorum(ask: Ask): { required: number; recorded: number } | null {
  const required = ask.approvals_required;
  if (required <= 1) return null;
  return { required, recorded: Math.min(ask.approvals_recorded, required) };
}

/**
 * The machine an ask is parked on, by the name the team gave it.
 */
export function askMachineName(instanceID: string, instances: Instance[] | undefined): string {
  return instances?.find(instance => instance.id === instanceID)?.name ?? instanceID;
}

/**
 * Why no ask in this account can be answered from here, or null when they can.
 */
export function answeringBlock(account: Account | undefined, role?: string): string | null {
  if (account === undefined) return null;
  if (account.suspended) {
    return 'This account is suspended, so no ask here can be answered.';
  }
  if (account.subscription_state === 'on_hold') {
    return role === 'tenant_owner' || role === 'tenant_admin'
      ? 'A payment failed, so answers are not being accepted for this account. Update the card in billing to answer this ask.'
      : 'A payment failed, so answers are not being accepted for this account. An owner or admin has to update the card in billing before this can be answered.';
  }
  return null;
}

/**
 * The relay's role names as words.
 */
export function approverRoleLabel(role: string): string {
  switch (role) {
    case 'tenant_owner':
      return 'an owner';
    case 'tenant_admin':
      return 'an admin or owner';
    case 'tenant_user':
      return 'a member';
    default:
      return role;
  }
}

/**
 * What a closed card says, in words about the reader rather than about the system.
 */
export function outcomeSentence(outcome: AskOutcome): string {
  switch (outcome.closure) {
    case 'settled-here':



      switch (outcome.decision) {
        case 'allow':
          return 'Allowed. The agent is going ahead.';
        case 'deny':
          return 'Denied. The agent has been told.';
        case 'answer':
          return 'Answered. The agent has been told.';
        default:
          return 'Your answer reached the machine.';
      }
    case 'already-decided':
      return 'Someone else answered this first.';
    case 'answered':
      return 'Answered somewhere else.';
    case 'expired':
      return 'The machine stopped waiting for an answer.';
    case 'superseded':
      return 'The agent withdrew this.';
  }
}

/**
 * Whether a closed card should read as a refusal rather than as a completion.
 */
export function outcomeIsRefusal(outcome: AskOutcome): boolean {
  return outcome.closure === 'expired' || outcome.decision === 'deny';
}

/**
 * The agents a member is subscribed to, folded for a screen.
 */
export interface SubscribedAgents {
  all: boolean;
  named: string[];
}

export function subscribedAgents(subscriptions: AskSubscription[]): SubscribedAgents {
  const named: string[] = [];
  let all = false;
  for (const subscription of subscriptions) {
    if (subscription.agent_name === ALL_AGENTS) all = true;
    else named.push(subscription.agent_name);
  }
  return { all, named: named.sort((a, b) => a.localeCompare(b)) };
}

/**
 * Whether this member would be shown anything at all.
 */
export function subscribesToNothing(agents: SubscribedAgents): boolean {
  return !agents.all && agents.named.length === 0;
}
