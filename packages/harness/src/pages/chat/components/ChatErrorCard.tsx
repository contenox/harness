import { RecoveryCard } from '@contenox/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { acpFailureCopyKeys, classifyAcpExecutionError } from '../../../lib/acpFailureKind';
import { ChatFailureRecovery } from './ChatFailureRecovery';

export interface ChatErrorCardProps {
  message: string;
  /** Title used when the failure kind has none of its own. */
  fallbackTitleKey: 'acp_chat.error_banner_headline' | 'acp_chat.turn_failed_label';
  actions?: (kind: ReturnType<typeof classifyAcpExecutionError>) => ReactNode;
}

/** A failed turn: connection problems go through ConnectionRepair, everything else is a RecoveryCard. */
export function ChatErrorCard({ message, fallbackTitleKey, actions }: ChatErrorCardProps) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const kind = classifyAcpExecutionError(message);
  const copy = acpFailureCopyKeys(kind);
  const card = (
    <RecoveryCard
      tone="error"
      title={copy.titleKey ? tk(copy.titleKey) : t(fallbackTitleKey)}
      actions={actions?.(kind)}
      details={message || undefined}
      detailsLabel={t('acp_chat.error_details_label')}
      className="my-1 min-w-0 [overflow-wrap:anywhere]">
      {copy.descriptionKey ? tk(copy.descriptionKey) : t('acp_chat.error_generic_description')}
    </RecoveryCard>
  );
  return <ChatFailureRecovery kind={kind} message={message} fallback={card} />;
}
