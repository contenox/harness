import type { TranslationKey } from '../i18n';

const PAGE_TITLES: Array<[prefix: string, key: TranslationKey]> = [
  ['/inbox', 'navbar.inbox'],
  ['/missions', 'navbar.missions'],
  ['/fleet', 'navbar.fleet'],
  ['/backends', 'navbar.backends'],
  ['/agents', 'navbar.agents'],
  ['/settings', 'navbar.settings'],
  ['/control', 'control_plane.hub_title'],
];

/** Translation key of the top-bar title for a non-chat route, or null when the route has none. */
export function pageTitleKey(pathname: string): TranslationKey | null {
  for (const [prefix, key] of PAGE_TITLES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return key;
  }
  return null;
}

export function isChatPath(pathname: string): boolean {
  return pathname === '/chat' || pathname.startsWith('/chat/');
}
