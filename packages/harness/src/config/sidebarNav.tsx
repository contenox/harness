import { Database, Inbox, Radar, Rocket, Settings, type LucideIcon } from 'lucide-react';
import type { TranslationKey } from '../i18n';

export interface SidebarNavDefinition {
  path: string;
  labelKey: TranslationKey;
  Icon: LucideIcon;
}

/** Labeled navigation shown at the bottom of the left sidebar. */
export const SIDEBAR_NAV: SidebarNavDefinition[] = [
  { path: '/inbox', labelKey: 'navbar.inbox', Icon: Inbox },
  { path: '/missions', labelKey: 'navbar.missions', Icon: Rocket },
  { path: '/fleet', labelKey: 'navbar.fleet', Icon: Radar },
  { path: '/backends', labelKey: 'navbar.backends', Icon: Database },
  { path: '/settings', labelKey: 'navbar.settings', Icon: Settings },
];
