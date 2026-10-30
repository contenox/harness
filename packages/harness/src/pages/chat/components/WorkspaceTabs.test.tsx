import '../../../test/fakeDomGlobals';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchChatPane,
  getChatPaneStore,
  resetChatPaneStore,
  setActiveChatPaneKey,
} from '../../../hooks/chatPaneStore';
import { installFakeDom, type FakeDomHandle } from '../../../test/fakeDom';

const mock = vi.hoisted(() => ({ openIds: ['s1'] as string[] }));

vi.mock('../../../hooks/useAcpWorkspace', () => {
  const fns = {
    openSessionTab: vi.fn(async () => {}),
    closeSessionTab: vi.fn(),
    focusSession: vi.fn(),
    focusEmptyTab: vi.fn(),
    adoptSession: vi.fn(),
  };
  const workspace = { status: 'ready', sessions: [] };
  return { useAcpWorkspace: () => ({ ...fns, workspace, openSessionIds: mock.openIds }) };
});
vi.mock('./ChatSessionTab', () => ({ ChatSessionTab: () => null }));

const { WorkspaceTabs } = await import('./WorkspaceTabs');

let dom: FakeDomHandle;
beforeEach(() => {
  dom = installFakeDom();
  resetChatPaneStore();
});
afterEach(() => dom.uninstall());

describe('WorkspaceTabs pane key', () => {
  it('makes the routed session the active pane target', async () => {
    const root = createRoot(dom.container as unknown as Element);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/chat/s1'] },
          createElement(
            Routes,
            null,
            createElement(Route, { path: '/chat/:sessionId', element: createElement(WorkspaceTabs) }),
          ),
        ),
      );
    });
    const { activeKey } = getChatPaneStore();
    expect(activeKey).toBe('s1');
    // What a top-bar toggle does: dispatch on the active key. It must land on the visible session.
    dispatchChatPane(activeKey, { type: 'toggle', pane: 'terminal' });
    expect(getChatPaneStore().byKey.s1.pane).toBe('terminal');
    expect(getChatPaneStore().byKey['']).toBeUndefined();
    setActiveChatPaneKey(activeKey);
    await act(async () => root.unmount());
  });
});
