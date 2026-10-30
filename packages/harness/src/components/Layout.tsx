import { LoadingState, WorkspaceShell } from '@contenox/ui';
import { useContext, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useDesktopTitleBarTheme } from '../hooks/useDesktopTitleBarTheme';
import { AuthContext } from '../lib/authContext';
import { AppTitleBar } from './shell/AppTitleBar';
import { useSetupGate } from './shell/useSetupGate';
import { useShellSidebar } from './shell/useShellSidebar';
import { SignInScreen } from './setup/SignInScreen';

type Props = {
  defaultOpen?: boolean;
  mainContent: ReactNode;
  sidebarContent: ReactNode | ((props: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => ReactNode);
  className?: string;
};

export function Layout({ defaultOpen = true, mainContent, sidebarContent, className }: Props) {
  const sidebar = useShellSidebar(defaultOpen);
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();
  const gate = useSetupGate(!!user);
  useDesktopTitleBarTheme();

  const inApp = !!user && !gate.loading && !gate.showSignIn;
  const titleBar = (
    <AppTitleBar
      signedIn={!!user}
      showSidebarToggle={inApp}
      sidebarOpen={sidebar.isOpen}
      onToggleSidebar={sidebar.toggle}
      showLogin={!user && pathname !== '/login'}
    />
  );

  if (!inApp) {
    return (
      <WorkspaceShell titleBar={titleBar} scroll={false} className={className}>
        {gate.loading ? <LoadingState className="h-full" /> : gate.showSignIn ? <SignInScreen data={gate.data} /> : mainContent}
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      titleBar={titleBar}
      scroll={false}
      className={className}
      sidebarOpen={sidebar.isOpen}
      onSidebarClose={() => sidebar.setIsOpen(false)}
      sidebar={
        typeof sidebarContent === 'function'
          ? sidebarContent({ isOpen: sidebar.isOpen, setIsOpen: sidebar.setIsOpen })
          : sidebarContent
      }>
      {mainContent}
    </WorkspaceShell>
  );
}
