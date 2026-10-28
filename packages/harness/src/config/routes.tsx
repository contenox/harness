import {
  Database,
  Folder,
  Inbox,
  Radar,
  Rocket,
  Settings,
  SquareTerminal,
  type LucideIcon,
  Bot,
} from 'lucide-react';
import { lazy } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import i18n, { type TranslationKey } from '../i18n';
import HomeRedirect from '../pages/HomeRedirect.tsx';
import { LOGIN_ROUTE } from './routeConstants.ts';

const AcpChatPage = lazy(() => import('../pages/chat/AcpChatPage.tsx'));
const WorkbenchPage = lazy(() => import('../pages/workbench/WorkbenchPage.tsx'));
const BackendsPage = lazy(() => import('../pages/admin/backends/BackendPage.tsx'));
const FleetPage = lazy(() => import('../pages/admin/fleet/FleetPage.tsx'));
const MissionListPage = lazy(() => import('../pages/admin/missions/MissionListPage.tsx'));
const MissionDetailPage = lazy(() => import('../pages/admin/missions/MissionDetailPage.tsx'));
const MissionDispatchPage = lazy(() => import('../pages/admin/missions/MissionDispatchPage.tsx'));
const InboxPage = lazy(() => import('../pages/admin/inbox/InboxPage.tsx'));
const ProjectsPage = lazy(() => import('../pages/admin/projects/ProjectsPage.tsx'));
const AgentsPage = lazy(() => import('../pages/admin/agents/AgentsPage.tsx'));
const ControlPlanePage = lazy(() => import('../pages/admin/control/ControlPlanePage.tsx'));
const SettingsPage = lazy(() => import('../pages/admin/settings/SettingsPage.tsx'));
const ConsolePage = lazy(() => import('../pages/admin/console/ConsolePage.tsx'));
const ByePage = lazy(() => import('../pages/public/bye/Bye.tsx'));
const AuthPage = lazy(() => import('../pages/public/login/AuthPage.tsx'));

const LegacyChatsRedirect = () => <Navigate to="/chat" replace />;
const LegacyConsoleRedirect = () => <Navigate to="/chat" replace />;
const AcpChatSessionRedirect = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <Navigate to={`/chat/${sessionId}`} replace />;
};

interface RouteConfig {
  path: string;
  element: React.ComponentType;
  label: string;
  icon?: React.ReactNode;
  showInNav?: boolean;
  system?: boolean;
  protected: boolean;
  showInShelf?: boolean;
}

export type AdminNavItem = {
  path: string;
  label: string;
  icon?: React.ReactNode;
};

type AdminRouteDefinition = {
  path: string;
  element: React.ComponentType;
  labelKey: TranslationKey;
  Icon: LucideIcon;
};

const adminRouteDefinitions: AdminRouteDefinition[] = [
  { path: '/fleet', element: FleetPage, labelKey: 'navbar.fleet', Icon: Radar },
  { path: '/missions', element: MissionListPage, labelKey: 'navbar.missions', Icon: Rocket },
  { path: '/inbox', element: InboxPage, labelKey: 'navbar.inbox', Icon: Inbox },
  { path: '/backends', element: BackendsPage, labelKey: 'navbar.backends', Icon: Database },
  { path: '/projects', element: ProjectsPage, labelKey: 'navbar.projects', Icon: Folder },
  { path: '/agents', element: AgentsPage, labelKey: 'navbar.agents', Icon: Bot },
  { path: '/terminal', element: ConsolePage, labelKey: 'navbar.console', Icon: SquareTerminal },
  { path: '/settings', element: SettingsPage, labelKey: 'navbar.settings', Icon: Settings },
];

export const adminNavItems: AdminNavItem[] = adminRouteDefinitions.map(({ path, labelKey, Icon }) => ({
  path,
  label: i18n.t(labelKey),
  icon: <Icon className="h-[1em] w-[1em]" />,
}));

const adminRoutes: RouteConfig[] = adminRouteDefinitions.map(def => ({
  path: def.path,
  element: def.element,
  label: i18n.t(def.labelKey),
  icon: <def.Icon className="h-[1em] w-[1em]" />,
  showInNav: false,
  protected: true,
  showInShelf: false,
}));

export const routes: RouteConfig[] = [
  {
    path: '/',
    element: HomeRedirect,
    label: '',
    showInNav: false,
    protected: false,
    showInShelf: false,
  },
  {
    path: '/chat',
    element: AcpChatPage,
    label: i18n.t('navbar.chat'),
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/chat/:sessionId',
    element: AcpChatPage,
    label: i18n.t('navbar.chat'),
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/workbench/:sessionId',
    element: WorkbenchPage,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/workbench',
    element: WorkbenchPage,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/chats',
    element: LegacyChatsRedirect,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/chat-acp',
    element: LegacyChatsRedirect,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/chat-acp/:sessionId',
    element: AcpChatSessionRedirect,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/chat-legacy/:chatId',
    element: LegacyConsoleRedirect,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/console',
    element: LegacyConsoleRedirect,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/console/:chatId',
    element: LegacyConsoleRedirect,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/control',
    element: ControlPlanePage,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  ...adminRoutes,
  {
    path: '/missions/new',
    element: MissionDispatchPage,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: '/missions/:id',
    element: MissionDetailPage,
    label: '',
    showInNav: false,
    protected: true,
    showInShelf: false,
  },
  {
    path: LOGIN_ROUTE,
    element: AuthPage,
    label: i18n.t('login.title'),
    showInNav: false,
    protected: false,
    showInShelf: false,
  },
  {
    path: '/bye',
    element: ByePage,
    label: i18n.t('navbar.bye'),
    showInNav: false,
    system: true,
    protected: false,
    showInShelf: false,
  },
  {
    path: '*',
    element: () => i18n.t('pages.not_found'),
    label: i18n.t('pages.not_found'),
    showInNav: false,
    system: true,
    protected: false,
    showInShelf: false,
  },
];
