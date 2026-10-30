import { beforeEach, describe, expect, it } from 'vitest';
import {
  dispatchChatPane,
  getChatPaneStore,
  resetChatPaneStore,
  setActiveChatPaneKey,
} from './chatPaneStore';

beforeEach(() => resetChatPaneStore());

describe('chatPaneStore', () => {
  it('tracks pane state per tab key and the active key separately', () => {
    dispatchChatPane('s1', { type: 'toggle', pane: 'terminal' });
    dispatchChatPane('s2', { type: 'openFile', path: 'a.ts' });
    setActiveChatPaneKey('s2');
    const store = getChatPaneStore();
    expect(store.activeKey).toBe('s2');
    expect(store.byKey.s1.pane).toBe('terminal');
    expect(store.byKey.s2).toMatchObject({ pane: 'files', activeFile: 'a.ts' });
  });

  it('does not replace the store for no-op actions', () => {
    const before = getChatPaneStore();
    dispatchChatPane('s1', { type: 'close' });
    setActiveChatPaneKey(before.activeKey);
    expect(getChatPaneStore()).toBe(before);
  });

  it('is shared between duplicated module instances (HMR)', async () => {
    const dupPath = './chatPaneStore?dup=1';
    const dup = (await import(/* @vite-ignore */ dupPath)) as typeof import('./chatPaneStore');
    expect(dup.getChatPaneStore).not.toBe(getChatPaneStore);
    setActiveChatPaneKey('s9');
    expect(dup.getChatPaneStore().activeKey).toBe('s9');
    dup.dispatchChatPane('s9', { type: 'toggle', pane: 'terminal' });
    expect(getChatPaneStore().byKey.s9.pane).toBe('terminal');
  });
});
