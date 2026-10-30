import { useTranslation } from 'react-i18next';
import { SIDEBAR_NAV } from '../../config/sidebarNav';
import { SidebarNav } from './SidebarNav';

/** App-level destinations pinned to the bottom of the sidebar. */
export function SidebarFooterNav({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation();
  const items = SIDEBAR_NAV.map(({ path, labelKey, Icon }) => ({
    path,
    label: t(labelKey),
    icon: <Icon aria-hidden />,
  }));
  return (
    <div className="shrink-0 border-t border-line p-2">
      <SidebarNav items={items} onNavigate={onNavigate} ariaLabel={t('acp_sidebar.navigation')} />
    </div>
  );
}
