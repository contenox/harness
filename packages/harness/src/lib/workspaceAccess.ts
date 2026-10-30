import { cwdApiFetch } from './projectRuntime';

export type AccessAction = 'allow' | 'approve' | 'deny';

export type AccessReason = 'matched_rule' | 'default_action';

export interface DimensionVerdict {
  action: AccessAction;
  reason?: AccessReason;
  rule?: number;
}

export interface PathVerdict {
  path: string;
  reachable: boolean;
  read?: DimensionVerdict;
  write?: DimensionVerdict;
}

export interface AccessEvaluateRequest {
  paths: string[];
}

export interface AccessEvaluateResponse {
  policyName: string;
  verdicts: PathVerdict[];
}

export const HITL_POLICY_DEFAULT_VALUE = '__contenox_default__';

export function dedupeSortPaths(paths: readonly string[]): string[] {
  return Array.from(new Set(paths)).sort((a, b) => a.localeCompare(b));
}

export function verdictsToMap(verdicts: readonly PathVerdict[]): Map<string, PathVerdict> {
  const map = new Map<string, PathVerdict>();
  for (const v of verdicts) map.set(v.path, v);
  return map;
}

export function accessUrl(root: string, policy?: string | null): string {
  const params = new URLSearchParams({ root });
  const p = policy?.trim();
  if (p && p !== HITL_POLICY_DEFAULT_VALUE) params.set('policy', p);
  return `/api/workspace/access?${params.toString()}`;
}

export async function fetchWorkspaceAccess(
  root: string,
  policy: string | null | undefined,
  paths: string[],
): Promise<AccessEvaluateResponse> {
  const body: AccessEvaluateRequest = { paths };
  return cwdApiFetch<AccessEvaluateResponse>(root, accessUrl(root, policy), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
