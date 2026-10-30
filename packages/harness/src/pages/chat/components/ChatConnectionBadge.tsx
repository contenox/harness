import { Badge } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { AcpWorkspaceStatus } from '../../../hooks/acpWorkspaceState';
import { useAcpWorkspace } from '../../../hooks/useAcpWorkspace';

/** Only a degraded connection earns a pill; a healthy one renders nothing (no agent name, no status text). */
function brokenConnectionVariant(status: AcpWorkspaceStatus): 'warning' | 'error' | null {
  if (status === 'reconnecting') return 'warning';
  if (status === 'error' || status === 'disconnected') return 'error';
  return null;
}

export function ChatConnectionBadge() {
  const { t } = useTranslation();
  const { workspace } = useAcpWorkspace();
  const broken = brokenConnectionVariant(workspace.status);
  if (!broken) return null;
  return (
    <Badge variant={broken} size="sm" role="status">
      {t(`acp_chat.status_${workspace.status}`)}
    </Badge>
  );
}
