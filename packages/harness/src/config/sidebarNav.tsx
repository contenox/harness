import { Bot, Database, Inbox, Radar, Rocket, Settings, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { TranslationKey } from '../i18n';

export interface SidebarNavDefinition {
  path: string;
  labelKey: TranslationKey;
  Icon: LucideIcon;
  badge?: 'needs_you';
}

/** Labeled navigation shown at the bottom of the left sidebar. */
export const SIDEBAR_NAV: SidebarNavDefinition[] = [
  { path: '/inbox', labelKey: 'navbar.inbox', Icon: Inbox, badge: 'needs_you' },
  { path: '/missions', labelKey: 'navbar.missions', Icon: Rocket },
  { path: '/fleet', labelKey: 'navbar.fleet', Icon: Radar },
  { path: '/agents', labelKey: 'navbar.agents', Icon: Bot },
  { path: '/backends', labelKey: 'navbar.backends', Icon: Database },
  { path: '/permissions', labelKey: 'navbar.permissions', Icon: ShieldCheck },
  { path: '/settings', labelKey: 'navbar.settings', Icon: Settings },
];
