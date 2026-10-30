import { describe, expect, it } from 'vitest';
import { isChatPath, pageTitleKey } from './pageTitles';

describe('pageTitles', () => {
  it('maps routes to their translated nav label key', () => {
    expect(pageTitleKey('/settings')).toBe('navbar.settings');
    expect(pageTitleKey('/missions/abc')).toBe('navbar.missions');
    expect(pageTitleKey('/inbox')).toBe('navbar.inbox');
    expect(pageTitleKey('/chat')).toBeNull();
    expect(pageTitleKey('/settingsx')).toBeNull();
  });

  it('detects chat routes', () => {
    expect(isChatPath('/chat')).toBe(true);
    expect(isChatPath('/chat/s1')).toBe(true);
    expect(isChatPath('/chats')).toBe(false);
  });
});
