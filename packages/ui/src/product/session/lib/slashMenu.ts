
import type { AvailableCommand } from '@contenox/acp-client';
import type { CommandValueDomains } from './commandValueDomains';

/**
 * Whether the menu should be showing, and what the user has typed as the filter.
 */
export interface SlashMenuQuery {
  open: boolean;
  /**
   * The text after the `/`, which may be empty (the menu opens on the bare slash).
   */
  query: string;
}


const SLASH_TOKEN_RE = /^\/([a-zA-Z0-9_-]*)$/;

/**
 * Derives the menu's open state and filter query from the composer's draft.
 */
export function deriveSlashMenuQuery(draft: string): SlashMenuQuery {
  const match = SLASH_TOKEN_RE.exec(draft);
  if (match === null) return { open: false, query: '' };
  return { open: true, query: match[1] ?? '' };
}

/**
 * Case-insensitive prefix filter over the advertised commands, by name.
 */
export function filterSlashCommands(
  commands: AvailableCommand[],
  query: string,
): AvailableCommand[] {
  const lowered = query.toLowerCase();
  return commands.filter(command => command.name.toLowerCase().startsWith(lowered));
}

/**
 * The argument a command expects, as the agent described it (`[keep]`, `[title|-]`), plus the size of its value domain when it has one — or null for a command that expects neither.
 */
export function commandArgumentHint(command: AvailableCommand, valueCount = 0): string | null {
  const size = valueCount > 0 ? `(${valueCount} ${valueCount === 1 ? 'value' : 'values'})` : '';
  if (command.input === undefined) return size === '' ? null : size;
  const hint = command.input.hint?.trim() ?? '';
  if (hint === '') return size === '' ? '…' : size;
  return size === '' ? hint : `${hint} ${size}`;
}

/**
 * A command name and the partial first argument typed after it.
 */
export interface SlashArgumentQuery {
  /**
   * The bare name typed before the space, as typed.
   */
  command: string;
  /**
   * Everything after that space — empty the moment the space arrives.
   */
  arg: string;
}

const ARGUMENT_BREAK_RE = /[ \t\n]/;

/**
 * Splits `/name partial` into its halves, or null when the draft is not that.
 */
export function deriveSlashArgument(draft: string): SlashArgumentQuery | null {
  if (!draft.startsWith('/')) return null;
  const rest = draft.slice(1);
  const space = rest.search(ARGUMENT_BREAK_RE);
  if (space < 0) return null;
  const command = rest.slice(0, space);
  const arg = rest.slice(space + 1);
  if (command === '' || ARGUMENT_BREAK_RE.test(arg)) return null;
  return { command, arg };
}

/**
 * The values a command accepts, or null when it has no domain — which is not an error.
 */
export function valueDomainFor(
  domains: CommandValueDomains,
  command: string,
): readonly string[] | null {
  const values = domains.get(command);
  return values === undefined || values.length === 0 ? null : values;
}

/**
 * The domain under the partial typed so far: prefix matches first, then substring matches, each in the machine's own order, case-insensitively.
 */
export function filterValueDomain(values: readonly string[], partial: string): string[] {
  const query = partial.trim().toLowerCase();
  if (query === '') return [...values];
  const prefix: string[] = [];
  const contains: string[] = [];
  for (const value of values) {
    const lowered = value.toLowerCase();
    if (lowered.startsWith(query)) prefix.push(value);
    else if (lowered.includes(query)) contains.push(value);
  }
  return [...prefix, ...contains];
}

/**
 * What accepting a value puts in the composer: the command and the value, with NO trailing space, so accepting twice re-selects the same value instead of wiping the argument.
 */
export function valueCompletion(command: string, value: string): string {
  return `/${command} ${value}`;
}

/**
 * Which row is highlighted, by position and by the value that was under it.
 */
export interface ValueHighlight {
  index: number;
  /**
   * The value the highlight was last moved onto, or null for "the top of the list".
   */
  value: string | null;
}


export const TOP_OF_LIST: ValueHighlight = { index: 0, value: null };

/**
 * Where the highlight lands in a value list.
 */
export function resolveValueIndex(values: readonly string[], highlight: ValueHighlight): number {
  if (values.length === 0) return 0;
  if (highlight.value !== null) {
    const found = values.indexOf(highlight.value);
    if (found >= 0) return found;
  }
  return clampIndex(highlight.index, values.length);
}

/**
 * What accepting an entry puts in the composer.
 */
export function slashCompletion(command: AvailableCommand): string {
  return `/${command.name} `;
}

export type SlashMenuKeyAction =
  { type: 'move'; delta: 1 | -1 } | { type: 'accept' } | { type: 'close' };

/**
 * Maps a keydown to the action it drives, or null for a key the menu does not intercept (which the composer then handles normally).
 */
export function slashMenuKeyFromEvent(key: string): SlashMenuKeyAction | null {
  switch (key) {
    case 'ArrowDown':
      return { type: 'move', delta: 1 };
    case 'ArrowUp':
      return { type: 'move', delta: -1 };
    case 'Tab':
      return { type: 'accept' };
    case 'Escape':
      return { type: 'close' };
    default:
      return null;
  }
}

/**
 * Wraps `index` into `[0, length)`, so the list cycles.
 */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}
