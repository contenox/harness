import { InlineNotice } from '@contenox/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AcpSessionState } from '../../../hooks/acpSessionState';
import type { AcpWorkspaceStatus } from '../../../hooks/acpWorkspaceState';
import { AdoptedSessionBanner } from '../../../components/AdoptedSessionBanner';
import type { AdoptResult } from '../../../lib/adoptMeta';
import { PlanPanel } from './PlanPanel';
import { ExecutionErrorBanner, ResumedBanner } from './SessionBanners';

export interface SessionHeaderAreaProps {
  adopted: AdoptResult | null;
  agentName: string | null;
  workspaceStatus: AcpWorkspaceStatus;
  connectionBanner: AcpSessionState['connectionBanner'];
  error: string | null;
  plan: AcpSessionState['plan'];
  onOpenSettings: () => void;
}

/** Everything that sits above the transcript: adoption / connection / error banners and the plan. */
export const SessionHeaderArea = memo(function SessionHeaderArea({
  adopted,
  agentName,
  workspaceStatus,
  connectionBanner,
  error,
  plan,
  onOpenSettings,
}: SessionHeaderAreaProps) {
  const { t } = useTranslation();
  return (
    <>
      {adopted && (
        <AdoptedSessionBanner instanceId={adopted.instanceId} controller={adopted.controller} agentName={agentName} />
      )}
      {workspaceStatus === 'reconnecting' && (
        <InlineNotice variant="warning">{t('acp_chat.banner_reconnecting')}</InlineNotice>
      )}
      {connectionBanner === 'disconnected' && (
        <InlineNotice variant="warning">{t('acp_chat.banner_disconnected')}</InlineNotice>
      )}
      {connectionBanner === 'resumed' && <ResumedBanner />}
      {error && <ExecutionErrorBanner message={error} onOpenSettings={onOpenSettings} />}
      <PlanPanel entries={plan} />
    </>
  );
});
