
export function shellCommandLine(rawInput: unknown): string | null {
  if (rawInput == null || typeof rawInput !== 'object') return null;
  const obj = rawInput as Record<string, unknown>;
  const command = typeof obj.command === 'string' ? obj.command : null;
  if (!command) return null;
  const args = Array.isArray(obj.args) ? obj.args.filter((a): a is string => typeof a === 'string') : [];
  return ['$', command, ...args].join(' ');
}

export function shellOutputLines(rawOutput: unknown): string[] | null {
  return typeof rawOutput === 'string' ? rawOutput.split('\n') : null;
}
