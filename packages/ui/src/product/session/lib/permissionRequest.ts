import type {
  PermissionToolCall,
  RequestPermissionRequest,
  ToolCallContent,
} from '@contenox/acp-client';

/**
 * What a pending permission request actually contains, extracted once so the card renders and never parses.
 */

/**
 * A `type:"diff"` content block, with both texts resolved and a path to name it.
 */
export interface PermissionDiff {
  path: string;
  oldText: string;
  newText: string;
}

/**
 * One top-level entry of `rawInput`, as text, clamped for a phone.
 */
export interface PermissionArgument {
  /**
   * The argument's own key.
   */
  key: string;
  /**
   * The value as text: a string as itself, anything else as indented JSON.
   */
  value: string;
  /**
   * Lines of `value` withheld by the clamp; 0 when it was shown whole.
   */
  hiddenLines: number;
}

/**
 * Everything the card can put in front of a person, already bounded.
 */
export interface PermissionEvidence {
  /**
   * Structured diffs, in wire order.
   */
  diffs: PermissionDiff[];
  /**
   * The text the runtime chose to describe the call — a raw diff, or an argument summary.
   */
  summary: string;
  /**
   * Whether `rawInput` was on the request at all.
   */
  argumentsSent: boolean;
  /**
   * `rawInput`'s entries, clamped.
   */
  args: PermissionArgument[];
  /**
   * Entries of `rawInput` withheld by the clamp; 0 when all were shown.
   */
  hiddenArguments: number;
}

/**
 * The approval envelope, validated.
 */
export interface PermissionMeta {
  /**
   * The HITL policy that evaluated the call, and where it lives on the machine.
   */
  policyName: string;
  policyPath: string;
  /**
   * The 0-based index of the rule that gated the call, or `null`.
   */
  matchedRule: number | null;
  /**
   * What in the call tripped the rule, when the rule names a cause.
   */
  detail: string;
  /**
   * The call's DECLARED reach — a declaration, not a proof.
   */
  mayCall: string[];
  /**
   * `true` = [mayCall] is exhaustive, `false` = it reaches undeclared others, `null` = unknown.
   */
  mayCallDeclared: boolean | null;
  /**
   * The durable ask's id — the argument `contenox approvals respond` takes.
   */
  askId: string;
  /**
   * RFC3339 UTC: when the ask stops being answerable.
   */
  expiresAt: string;
  /**
   * The verdict that applies at [expiresAt] if nobody answers ("allow" / "deny").
   */
  onTimeout: string;
  /**
   * The command that answers this ask from a terminal, when the card is gone.
   */
  recoveryCommand: string;
}


export const ARGUMENT_MAX_LINES = 10;
export const ARGUMENT_MAX_CHARS = 800;


export const ARGUMENT_MAX_ENTRIES = 12;

/**
 * Reads the approval envelope off a permission request.
 */
export function permissionMetaFrom(request: RequestPermissionRequest): PermissionMeta {
  const outer = asRecord(request._meta);
  const inner = asRecord(request.toolCall._meta);
  const read = (key: string): unknown => (key in outer ? outer[key] : inner[key]);

  return {
    policyName: asText(read('policyName')),
    policyPath: asText(read('policyPath')),
    matchedRule: asIndex(read('matchedRule')),
    detail: asText(read('detail')),
    mayCall: asTextList(read('mayCall')),
    mayCallDeclared: asFlag(read('mayCallDeclared')),
    askId: asText(read('askId')),
    expiresAt: asText(read('expiresAt')),
    onTimeout: asText(read('onTimeout')),
    recoveryCommand: asText(read('recoveryCommand')),
  };
}

/**
 * Reads and bounds everything a permission's tool call says about itself.
 */
export function permissionEvidence(toolCall: PermissionToolCall): PermissionEvidence {
  const blocks: ToolCallContent[] = Array.isArray(toolCall.content) ? toolCall.content : [];
  const { args, hidden } = clampArguments(toolCall.rawInput);
  return {
    diffs: blocks.filter(isDiffBlock).map(toDiff),
    summary: blocks
      .filter(block => block?.type === 'content')
      .map(block => asVerbatim(block.content?.text))
      .filter(text => text.trim() !== '')
      .join('\n\n'),
    argumentsSent: toolCall.rawInput !== undefined && toolCall.rawInput !== null,
    args,
    hiddenArguments: hidden,
  };
}


function isDiffBlock(block: ToolCallContent): boolean {
  if (block?.type !== 'diff') return false;
  if (asText(block.path) === '') return false;
  return asVerbatim(block.oldText) !== asVerbatim(block.newText);
}

function toDiff(block: ToolCallContent): PermissionDiff {
  return {
    path: asText(block.path),
    oldText: asVerbatim(block.oldText),
    newText: asVerbatim(block.newText),
  };
}


function clampArguments(rawInput: unknown): { args: PermissionArgument[]; hidden: number } {
  if (rawInput === undefined || rawInput === null) return { args: [], hidden: 0 };
  if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    return { args: [clampArgument('', rawInput)], hidden: 0 };
  }
  const entries = Object.entries(rawInput as Record<string, unknown>);
  return {
    args: entries
      .slice(0, ARGUMENT_MAX_ENTRIES)
      .map(([key, value]) => clampArgument(key, value)),
    hidden: Math.max(0, entries.length - ARGUMENT_MAX_ENTRIES),
  };
}

function clampArgument(key: string, value: unknown): PermissionArgument {
  const text = typeof value === 'string' ? value : stringify(value);
  const lines = text.split('\n');
  let shown = lines.slice(0, ARGUMENT_MAX_LINES).join('\n');
  let hiddenLines = lines.length - Math.min(lines.length, ARGUMENT_MAX_LINES);
  if (shown.length > ARGUMENT_MAX_CHARS) {


    shown = shown.slice(0, ARGUMENT_MAX_CHARS);
    hiddenLines += 1;
  }
  return { key, value: shown, hiddenLines };
}


function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}


function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}


function asVerbatim(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function asIndex(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function asFlag(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}
