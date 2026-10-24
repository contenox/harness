import { Badge, Span } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useAcpWorkspace } from '../../../hooks/useAcpWorkspace';
import type { AcpWorkspaceStatus } from '../../../hooks/acpWorkspaceState';
import { useStagedAgent } from '../../../lib/stagedAgent';
import { resolveActiveAgentName } from '../lib/activeAgent';

function statusBadgeVariant(status: AcpWorkspaceStatus): 'success' | 'warning' | 'error' | 'secondary' {
  if (status === 'ready') return 'success';
  if (status === 'reconnecting') return 'warning';
  if (status === 'error' || status === 'disconnected' || status === 'setup_required') return 'error';
  return 'secondary';
}

export function ChatConnectionBadge() {
  const { t } = useTranslation();
  const { workspace, sessions } = useAcpWorkspace();
  const { stagedAgent } = useStagedAgent();

  const activeSessionId = workspace.activeSessionId;
  const activeSessionMeta = workspace.sessions.find(s => s.sessionId === activeSessionId)?._meta;
  const agentName = resolveActiveAgentName({
    sessionMeta: activeSessionMeta,
    isEmptySurface: activeSessionId == null,
    stagedAgent,
    workspaceAgentName: workspace.agentName,
  });

  const activeSession = activeSessionId ? sessions.slices[activeSessionId] : null;
  const isPrompting = activeSession?.isPrompting ?? false;
  const runningTool = activeSession?.isPrompting
    ? Object.values(activeSession.toolCalls).find(
        tc => tc.status === 'in_progress' || tc.status === 'pending'
      )
    : null;

  const badgeVariant = isPrompting ? 'primary' : statusBadgeVariant(workspace.status);
  const badgeText = isPrompting ? t('acp_chat.status_working') : t(`acp_chat.status_${workspace.status}`);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Badge variant={badgeVariant} size="sm">
        {badgeText}
      </Badge>
      {agentName && (
        <Span variant="muted" className="truncate text-sm">
          {agentName}
        </Span>
      )}
      {runningTool && (
        <Span variant="muted" className="truncate text-xs font-mono">
          → {runningTool.title ?? runningTool.kind ?? runningTool.toolCallId}
        </Span>
      )}
    </div>
  );
}
