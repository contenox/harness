
export interface SlashMenuEntry {
  name: string;
  description: string;
  usage?: string;
}

export function deriveSlashMenuQuery(draft: string): { open: boolean; query: string } {
  const match = /^\/([a-zA-Z0-9_-]*)$/.exec(draft);
  if (!match) return { open: false, query: '' };
  return { open: true, query: match[1] ?? '' };
}

export function filterSlashCommands(entries: SlashMenuEntry[], query: string): SlashMenuEntry[] {
  const q = query.toLowerCase();
  return entries.filter(e => e.name.toLowerCase().startsWith(q));
}

export type SlashMenuKeyAction = { type: 'move'; delta: 1 | -1 } | { type: 'accept' } | { type: 'close' };

export function slashMenuKeyFromEvent(key: string): SlashMenuKeyAction | null {
  switch (key) {
    case 'ArrowDown':
      return { type: 'move', delta: 1 };
    case 'ArrowUp':
      return { type: 'move', delta: -1 };
    case 'Tab':
    case 'Enter':
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
