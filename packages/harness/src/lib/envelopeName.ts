export function envelopeDisplayName(raw: string): string {
  const name = raw.trim().replace(/\\/g, '/');
  return name.split('/').pop() ?? name;
}
