
import type {
  ConsumerSessionMode,
  ConsumerSource,
  ConsumerTargetKind,
  EventConsumer,
  Instance,
} from '../../../lib/api/types';
import { MAX_TARGET_NAME_BYTES } from '../../../lib/api/types';
import { byteLength, hasControlCharacter } from '../../../lib/askAgents';

/**
 * The session mode, in the words the choice was made with.
 */
export function sessionModeLabel(mode: ConsumerSessionMode): string {
  return mode === 'new'
    ? 'Each event starts a fresh session'
    : 'Events land in one session that is reused';
}

/**
 * What a listed consumer says about where its events land, with the session NAMED when there is one.
 */
export function sessionSentence(consumer: EventConsumer): string {
  const name = (consumer.session_name ?? '').trim();
  if (consumer.session_mode === 'new' || name === '')
    return sessionModeLabel(consumer.session_mode);
  return `Events land in the session ${name}`;
}

/**
 * What a consumer runs, and which kind of thing it is.
 */
export function consumerTarget(
  consumer: EventConsumer,
): { kind: ConsumerTargetKind; name: string } | null {
  const agent = (consumer.agent_name ?? '').trim();
  if (agent !== '') return { kind: 'agent', name: agent };
  const chain = (consumer.chain ?? '').trim();
  if (chain !== '') return { kind: 'chain', name: chain };
  return null;
}

/**
 * The sentence a row uses for what runs.
 */
export function targetSentence(consumer: EventConsumer): string {
  const target = consumerTarget(consumer);
  if (target === null) return 'Runs nothing this listing can name';
  return target.kind === 'agent'
    ? `Runs the agent ${target.name}`
    : `Runs the chain ${target.name}`;
}

/**
 * Why the relay would refuse an agent name or a session name on a consumer, or null when it would not.
 */
export function targetNameRefusal(raw: string, field: 'agent' | 'session'): string | null {
  const name = raw.trim();
  if (name === '') return null;
  if (byteLength(name) > MAX_TARGET_NAME_BYTES) {
    return `That ${field} name is too long — at most ${MAX_TARGET_NAME_BYTES} bytes.`;
  }
  if (hasControlCharacter(name)) return `That ${field} name carries a control character.`;
  return null;
}

/**
 * The source, as the create form's picker offers it — what posts, not the wire token: `generic` is a system that can hold a secret and sign a POST, `form` is an HTML form a browser posts directly.
 */
export function sourceLabel(source: ConsumerSource): string {
  return source === 'form' ? 'Browser form posts' : 'Signed JSON events';
}

/**
 * What a listed consumer's row says about how its events arrive.
 */
export function ingestSummary(consumer: EventConsumer): string {
  if (consumer.source !== 'form') return 'Accepts signed JSON events';
  const origins = consumer.allowed_origins ?? [];
  if (origins.length === 0) return 'Accepts browser form posts';
  if (origins.length === 1) return `Accepts browser form posts from ${origins[0]}`;
  return `Accepts browser form posts from ${origins[0]} and ${origins.length - 1} more`;
}

/**
 * One entry of the receiver picker.
 */
export interface ReceiverOption {
  value: string;
  label: string;
}

/**
 * The machines a consumer may deliver to, as select options: connected first, then offline, alphabetical within each band — the same scanning order the Hosts screen uses, because "which machine can receive right now" is the question being answered.
 */
export function receiverOptions(instances: Instance[]): ReceiverOption[] {
  return instances
    .filter(instance => instance.revoked_at === null)
    .sort((a, b) => {
      const delta = Number(b.connected) - Number(a.connected);
      if (delta !== 0) return delta;
      return a.name.localeCompare(b.name);
    })
    .map(instance => ({
      value: instance.id,
      label: `${instance.name} (${connectionWord(instance)})`,
    }));
}

/**
 * A machine's reachability as one word, for the receiver picker and the listed consumer's row.
 */
export function connectionWord(instance: Instance): string {
  if (instance.revoked_at !== null) return 'revoked';
  if (instance.connected) return 'connected';
  return instance.last_seen_at === null ? 'never connected' : 'offline';
}

/**
 * What a consumer's row says about its receiver.
 */
export function receiverLabel(instanceID: string, instances: Instance[] | undefined): string {
  const instance = instances?.find(candidate => candidate.id === instanceID);
  if (instance === undefined) return instanceID;
  return `${instance.name} (${connectionWord(instance)})`;
}

/**
 * Newest first, then by name — so the consumer just created is the first row.
 */
export function compareConsumers(a: EventConsumer, b: EventConsumer): number {
  const delta = b.created_at.localeCompare(a.created_at);
  if (delta !== 0) return delta;
  return a.name.localeCompare(b.name);
}
