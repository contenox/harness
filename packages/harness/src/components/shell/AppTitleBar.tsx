import { Button, TitleBar } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTitleBarInsets } from '../../hooks/useTitleBarInsets';
import { useNavbarSlotValue } from '../NavbarSlot';
import { TopBarTitle } from '../TopBarTitle';
import { SidebarToggleButton } from './SidebarToggleButton';

type Props = {
  signedIn: boolean;
  /** Show the sidebar toggle (hidden before sign-in / during setup). */
  showSidebarToggle: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  showLogin: boolean;
};

/** Window title bar: sidebar toggle, page title, the page-claimed navbar slot, caption-button space. */
export function AppTitleBar({ signedIn, showSidebarToggle, sidebarOpen, onToggleSidebar, showLogin }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navbarSlot = useNavbarSlotValue();
  const insets = useTitleBarInsets();

  return (
    <TitleBar
      reserveStart={insets.start}
      reserveEnd={insets.end}
      start={
        showSidebarToggle ? <SidebarToggleButton isOpen={sidebarOpen} onToggle={onToggleSidebar} /> : undefined
      }
      end={
        <>
          {navbarSlot}
          {showLogin && (
            <Button size="sm" onClick={() => navigate('/login')}>
              {t('login.title')}
            </Button>
          )}
        </>
      }>
      <TopBarTitle signedIn={signedIn} />
    </TitleBar>
  );
}
