import { Button, RecoveryCard } from '@contenox/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { acpFailureCopyKeys, classifyAcpExecutionError, failedAgentName, type AcpFailureKind } from '../../../lib/acpFailureKind';
import { ChatFailureRecovery } from './ChatFailureRecovery';

export interface ChatErrorCardProps {
  message: string;
  /** Title used when the failure kind has none of its own. */
  fallbackTitleKey: 'acp_chat.error_banner_headline' | 'acp_chat.turn_failed_label';
  actions?: (kind: ReturnType<typeof classifyAcpExecutionError>) => ReactNode;
}

function AgentRecoveryAction({ agent, kind }: { agent: string; kind: AcpFailureKind }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Button type="button" size="sm" onClick={() => navigate(`/agents?agent=${encodeURIComponent(agent)}`)}>
      {kind === 'agent_sign_in' ? t('acp_recovery.agent_sign_in_action') : t('acp_recovery.agent_unavailable_action')}
    </Button>
  );
}

/** A failed turn: connection problems go through ConnectionRepair, everything else is a RecoveryCard. */
export function ChatErrorCard({ message, fallbackTitleKey, actions }: ChatErrorCardProps) {
  const { t } = useTranslation();
  const kind = classifyAcpExecutionError(message);
  const copy = acpFailureCopyKeys(kind);
  const agent = kind === 'agent_sign_in' || kind === 'agent_unavailable' ? failedAgentName(message) : null;
  const card = (
    <RecoveryCard
      tone="error"
      title={copy.titleKey ? t(copy.titleKey as never, { name: agent ?? '' }) : t(fallbackTitleKey)}
      actions={
        agent ? (
          <>
            <AgentRecoveryAction agent={agent} kind={kind} />
            {actions?.(kind)}
          </>
        ) : (
          actions?.(kind)
        )
      }
      details={message || undefined}
      detailsLabel={t('acp_chat.error_details_label')}
      className="my-1 min-w-0 [overflow-wrap:anywhere]">
      {copy.descriptionKey ? t(copy.descriptionKey as never, { name: agent ?? '' }) : t('acp_chat.error_generic_description')}
    </RecoveryCard>
  );
  return <ChatFailureRecovery kind={kind} message={message} fallback={card} />;
}
