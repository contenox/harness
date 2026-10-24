
import type { AvailableCommand } from '@contenox/acp-client';
import type { CommandValueDomains } from './commandValueDomains';

export interface SlashMenuQuery {
  open: boolean;
  query: string;
}


const SLASH_TOKEN_RE = /^\/([a-zA-Z0-9_-]*)$/;

export function deriveSlashMenuQuery(draft: string): SlashMenuQuery {
  const match = SLASH_TOKEN_RE.exec(draft);
  if (match === null) return { open: false, query: '' };
  return { open: true, query: match[1] ?? '' };
}

export function filterSlashCommands(
  commands: AvailableCommand[],
  query: string,
): AvailableCommand[] {
  const lowered = query.toLowerCase();
  return commands.filter(command => command.name.toLowerCase().startsWith(lowered));
}

export function commandArgumentHint(command: AvailableCommand, valueCount = 0): string | null {
  const size = valueCount > 0 ? `(${valueCount} ${valueCount === 1 ? 'value' : 'values'})` : '';
  if (command.input === undefined) return size === '' ? null : size;
  const hint = command.input.hint?.trim() ?? '';
  if (hint === '') return size === '' ? '…' : size;
  return size === '' ? hint : `${hint} ${size}`;
}

export interface SlashArgumentQuery {
  command: string;
  arg: string;
}

const ARGUMENT_BREAK_RE = /[ \t\n]/;

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

export function valueDomainFor(
  domains: CommandValueDomains,
  command: string,
): readonly string[] | null {
  const values = domains.get(command);
  return values === undefined || values.length === 0 ? null : values;
}

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

export function valueCompletion(command: string, value: string): string {
  return `/${command} ${value}`;
}

export interface ValueHighlight {
  index: number;
  value: string | null;
}


export const TOP_OF_LIST: ValueHighlight = { index: 0, value: null };

export function resolveValueIndex(values: readonly string[], highlight: ValueHighlight): number {
  if (values.length === 0) return 0;
  if (highlight.value !== null) {
    const found = values.indexOf(highlight.value);
    if (found >= 0) return found;
  }
  return clampIndex(highlight.index, values.length);
}

export function slashCompletion(command: AvailableCommand): string {
  return `/${command.name} `;
}

export type SlashMenuKeyAction =
  { type: 'move'; delta: 1 | -1 } | { type: 'accept' } | { type: 'close' };

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

export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}
