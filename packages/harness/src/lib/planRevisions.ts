import type { PlanRevisionSummary } from './types';


export function revisionsNewestFirst(
  revisions?: readonly PlanRevisionSummary[] | null,
): PlanRevisionSummary[] {
  if (!revisions || revisions.length === 0) return [];
  return revisions.slice().reverse();
}

export function latestRevision(
  revisions?: readonly PlanRevisionSummary[] | null,
): PlanRevisionSummary | undefined {
  if (!revisions || revisions.length === 0) return undefined;
  return revisions[revisions.length - 1];
}

export function formatRevisionDelta(added: number, removed: number): string {
  const parts: string[] = [];
  if (added > 0) parts.push(`+${added}`);
  if (removed > 0) parts.push(`−${removed}`);
  if (parts.length === 0) return '±0';
  return parts.join('/');
}
