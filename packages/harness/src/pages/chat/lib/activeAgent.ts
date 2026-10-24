import { externalAgentFromMeta } from '../../../lib/acp';

export function resolveActiveAgentName(input: {
  sessionMeta: Record<string, unknown> | null | undefined;
  isEmptySurface: boolean;
  stagedAgent: string | null;
  workspaceAgentName: string | null | undefined;
}): string | null {
  return (
    externalAgentFromMeta(input.sessionMeta) ??
    (input.isEmptySurface ? input.stagedAgent : null) ??
    input.workspaceAgentName ??
    null
  );
}
