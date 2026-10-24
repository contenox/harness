export function parseTerminalPassthrough(draft: string): string | null {
  const trimmed = draft.trimStart();
  if (!trimmed.startsWith('!')) return null;
  const command = trimmed.slice(1).trim();
  return command.length > 0 ? command : null;
}

export function splitTerminalLines(text: string): string[] {
  if (text === '') return [];
  return text.replace(/\r/g, '').split('\n');
}
