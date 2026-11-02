import type { Mission } from './types';

export function missionProblem(
  mission: Pick<Mission, 'status' | 'statusReason' | 'lastError'>,
): string | undefined {
  const lastError = mission.lastError?.trim();
  if (lastError) return lastError;
  if (mission.status !== 'derailed' && mission.status !== 'stuck') return undefined;
  const reason = mission.statusReason?.trim();
  return reason || undefined;
}
