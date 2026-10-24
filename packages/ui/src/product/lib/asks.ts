
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

export type AskClosure = 'answered' | 'expired' | 'superseded' | 'settled-here' | 'already-decided';

export interface AskOutcome {
  closure: AskClosure;
  decision?: AskDecision;
}

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

export function adoptAsks(board: AskBoard, asks: Ask[]): AskBoard {
  const present = new Set(asks.map(ask => ask.ask_id));
  const kept = board.asks.filter(ask => !present.has(ask.ask_id) && ask.ask_id in board.outcomes);
  const outcomes: Record<string, AskOutcome> = {};
  for (const ask of kept) outcomes[ask.ask_id] = board.outcomes[ask.ask_id];
  return { asks: [...asks, ...kept].sort(byNewest), outcomes };
}

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

export function openAsks(board: AskBoard): Ask[] {
  return board.asks.filter(ask => board.outcomes[ask.ask_id] === undefined);
}

export function asksWaitingOnCaller(board: AskBoard, block?: string | null): Ask[] {
  if (block !== undefined && block !== null && block.trim() !== '') return [];
  return openAsks(board).filter(ask => ask.may_answer && !ask.answered_by_caller);
}


const ATTENTION_TOOLS_NAME = 'mission';
const ATTENTION_TOOL_NAME = 'mission_ask_attention';

export type AskKind = 'approval' | 'question';

export function askKind(ask: Ask): AskKind {
  const tools = (ask.tools_name ?? '').trim();
  const tool = (ask.tool_name ?? '').trim();
  return tools === ATTENTION_TOOLS_NAME && tool === ATTENTION_TOOL_NAME ? 'question' : 'approval';
}

export function askHeadline(ask: Ask): string {
  const summary = (ask.summary ?? '').trim();
  if (summary !== '') return summary;
  const tool = (ask.tool_name ?? '').trim();
  if (tool !== '') return tool;
  return ask.ask_id;
}

export function quorum(ask: Ask): { required: number; recorded: number } | null {
  const required = ask.approvals_required;
  if (required <= 1) return null;
  return { required, recorded: Math.min(ask.approvals_recorded, required) };
}

export function askMachineName(instanceID: string, instances: Instance[] | undefined): string {
  return instances?.find(instance => instance.id === instanceID)?.name ?? instanceID;
}

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

export function outcomeIsRefusal(outcome: AskOutcome): boolean {
  return outcome.closure === 'expired' || outcome.decision === 'deny';
}

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

export function subscribesToNothing(agents: SubscribedAgents): boolean {
  return !agents.all && agents.named.length === 0;
}
