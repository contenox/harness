import { Badge } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { SIDEBAR_NAV } from '../../config/sidebarNav';
import { useApprovals } from '../../hooks/useApprovals';
import { needsYouCount } from '../../pages/admin/inbox/inboxPresentation';
import { SidebarNav } from './SidebarNav';

/** App-level destinations pinned to the bottom of the sidebar. */
export function SidebarFooterNav({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation();
  const { data: approvals } = useApprovals();
  const needsYou = needsYouCount(approvals);
  const items = SIDEBAR_NAV.map(({ path, labelKey, Icon, badge }) => ({
    path,
    label: t(labelKey),
    icon: <Icon aria-hidden />,
    meta:
      badge === 'needs_you' && needsYou > 0 ? (
        <Badge variant="error" size="sm" title={t('inbox.nav_badge_title', { n: needsYou })}>
          {needsYou}
        </Badge>
      ) : undefined,
  }));
  return (
    <div className="border-line shrink-0 border-t p-2">
      <SidebarNav items={items} onNavigate={onNavigate} ariaLabel={t('acp_sidebar.navigation')} />
    </div>
  );
}
