import type { PermissionOption, PermissionOptionKind } from '../../../lib/acp';


const KEY_TO_KIND: Record<string, PermissionOptionKind> = {
  y: 'allow_once',
  a: 'allow_always',
  n: 'reject_once',
};

export function optionForKey(options: PermissionOption[], key: string): PermissionOption | null {
  const kind = KEY_TO_KIND[key.toLowerCase()];
  if (!kind) return null;
  return options.find(o => o.kind === kind) ?? null;
}

export function safestRejectOption(options: PermissionOption[]): PermissionOption | null {
  return options.find(o => o.kind === 'reject_once') ?? options.find(o => o.kind.startsWith('reject')) ?? null;
}

export function orderedPermissionOptions(options: PermissionOption[]): PermissionOption[] {
  const rank = (o: PermissionOption) => (o.kind.startsWith('allow') ? 0 : o.kind.startsWith('reject') ? 1 : 2);
  return options
    .map((option, index) => ({ option, index }))
    .sort((a, b) => rank(a.option) - rank(b.option) || a.index - b.index)
    .map(({ option }) => option);
}

export function keyHintForOption(option: PermissionOption): string | null {
  switch (option.kind) {
    case 'allow_once':
      return 'Y';
    case 'allow_always':
      return 'A';
    case 'reject_once':
      return 'N';
    default:
      return null;
  }
}
