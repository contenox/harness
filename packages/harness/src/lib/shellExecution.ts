
export function shellCommandLine(rawInput: unknown): string | null {
  if (rawInput == null || typeof rawInput !== 'object') return null;
  const obj = rawInput as Record<string, unknown>;
  const command = typeof obj.command === 'string' ? obj.command : null;
  if (!command) return null;
  const args = Array.isArray(obj.args) ? obj.args.filter((a): a is string => typeof a === 'string') : [];
  return ['$', command, ...args].join(' ');
}

type ShellResult = { exit_code?: unknown; stdout?: unknown; stderr?: unknown; error?: unknown };

function shellResult(raw: unknown): ShellResult | null {
  let value = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return null;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (value == null || typeof value !== 'object') return null;
  return 'stdout' in value || 'exit_code' in value ? (value as ShellResult) : null;
}

function textLines(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') return [];
  return value.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
}

export function shellOutputLines(rawOutput: unknown): string[] | null {
  const result = shellResult(rawOutput);
  if (!result) return typeof rawOutput === 'string' ? rawOutput.split('\n') : null;
  const lines = [...textLines(result.stdout), ...textLines(result.stderr)];
  if (typeof result.error === 'string' && result.error !== '') lines.push(result.error);
  if (typeof result.exit_code === 'number' && (result.exit_code !== 0 || lines.length === 0)) {
    lines.push(`exit ${result.exit_code}`);
  }
  return lines;
}
