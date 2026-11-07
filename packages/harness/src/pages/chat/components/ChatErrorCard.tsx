import { Button, RecoveryCard } from '@contenox/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { acpFailureCopyKeys, classifyAcpExecutionError, failedAgentName, type AcpFailureKind } from '../../../lib/acpFailureKind';
import { translateRuntimeText } from '../../../lib/runtimeTexts';
import { ChatFailureRecovery } from './ChatFailureRecovery';

export interface ChatErrorCardProps {
  message: string;
  /** Short reason shown instead of the generic description. */
  summary?: string;
  /** Technical details shown instead of the message. */
  details?: string;
  /** Title used when the failure kind has none of its own. */
  fallbackTitleKey: 'acp_chat.error_banner_headline' | 'acp_chat.turn_failed_label';
  actions?: (kind: ReturnType<typeof classifyAcpExecutionError>) => ReactNode;
  onDismiss?: () => void;
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
export function ChatErrorCard({ message, summary, details, fallbackTitleKey, actions, onDismiss }: ChatErrorCardProps) {
  const { t } = useTranslation();
  const kind = classifyAcpExecutionError(message);
  const copy = acpFailureCopyKeys(kind);
  const agent = kind === 'agent_sign_in' || kind === 'agent_unavailable' ? failedAgentName(message) : null;
  const extra = actions?.(kind);
  const dismiss = onDismiss ? (
    <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
      {t('acp_chat.error_dismiss')}
    </Button>
  ) : null;
  const card = (
    <RecoveryCard
      tone="error"
      title={copy.titleKey ? t(copy.titleKey as never, { name: agent ?? '' }) : t(fallbackTitleKey)}
      actions={
        agent || extra || dismiss ? (
          <>
            {agent && <AgentRecoveryAction agent={agent} kind={kind} />}
            {extra}
            {dismiss}
          </>
        ) : undefined
      }
      details={details ?? (message || undefined)}
      detailsLabel={t('acp_chat.error_details_label')}
      className="my-1 min-w-0 [overflow-wrap:anywhere]">
      {copy.descriptionKey
        ? t(copy.descriptionKey as never, { name: agent ?? '' })
        : summary
          ? translateRuntimeText(summary, t)
          : t('acp_chat.error_generic_description')}
    </RecoveryCard>
  );
  return <ChatFailureRecovery kind={kind} message={message} fallback={card} />;
}
