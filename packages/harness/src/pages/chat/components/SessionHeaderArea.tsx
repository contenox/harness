import { InlineNotice } from '@contenox/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AdoptedSessionBanner } from '../../../components/AdoptedSessionBanner';
import type { AcpSessionState } from '../../../hooks/acpSessionState';
import type { AcpWorkspaceStatus } from '../../../hooks/acpWorkspaceState';
import type { AdoptResult } from '../../../lib/adoptMeta';
import { PlanPanel } from './PlanPanel';
import { ResumedBanner } from './SessionBanners';

export interface SessionHeaderAreaProps {
  adopted: AdoptResult | null;
  agentName: string | null;
  workspaceStatus: AcpWorkspaceStatus;
  connectionBanner: AcpSessionState['connectionBanner'];
  plan: AcpSessionState['plan'];
}

/** Everything that sits above the transcript: adoption / connection banners and the plan. */
export const SessionHeaderArea = memo(function SessionHeaderArea({
  adopted,
  agentName,
  workspaceStatus,
  connectionBanner,
  plan,
}: SessionHeaderAreaProps) {
  const { t } = useTranslation();
  return (
    <>
      {adopted && (
        <AdoptedSessionBanner
          instanceId={adopted.instanceId}
          controller={adopted.controller}
          agentName={agentName}
        />
      )}
      {workspaceStatus === 'reconnecting' && (
        <InlineNotice variant="warning">{t('acp_chat.banner_reconnecting')}</InlineNotice>
      )}
      {connectionBanner === 'disconnected' && (
        <InlineNotice variant="warning">{t('acp_chat.banner_disconnected')}</InlineNotice>
      )}
      {connectionBanner === 'resumed' && <ResumedBanner />}
      <PlanPanel entries={plan} />
    </>
  );
});
