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

const mock = vi.hoisted(() => ({ openIds: ['s1'] as string[], workspaceRoot: '/projects/first' }));

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
// Keep the tab mounted so the test exercises its real active-pane subscription.
vi.mock('../hooks/useChatSession', () => ({
  useChatSession: (id: string | null) => ({
    paneKey: id ?? ':' + mock.workspaceRoot,
    session: {},
    paneState: {},
    files: {},
    workspaceRoot: mock.workspaceRoot,
  }),
}));
vi.mock('../../../hooks/useConnectors', () => ({
  useBrowserRegistration: () => ({ data: { id: 'installed', workspace: '/projects/first' } }),
}));
vi.mock('../../BrowserPage', () => ({ BrowserPane: () => 'Installed browser' }));
vi.mock('./TerminalPane', () => ({ TerminalPane: () => null }));
vi.mock('./ChatSessionView', () => ({
  ChatSessionView: ({ hidden }: { hidden: boolean }) => (hidden ? 'Hidden chat' : 'Visible chat'),
}));
vi.mock('./SessionConnectorsDialog', () => ({ SessionConnectorsDialog: () => null }));

const { WorkspaceTabs } = await import('./WorkspaceTabs');
const { ChatSessionTab } = await import('./ChatSessionTab');

let dom: FakeDomHandle;
beforeEach(() => {
  dom = installFakeDom();
  mock.workspaceRoot = '/projects/first';
  resetChatPaneStore();
});
afterEach(() => dom.uninstall());

describe('WorkspaceTabs pane key', () => {
  it('scopes the Browser and draft panes to the selected workspace', async () => {
    const root = createRoot(dom.container as unknown as Element);
    const renderDraft = () =>
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/chat?browser=installed'] },
          createElement(ChatSessionTab, { sessionId: null, onSessionCreated: () => {} }),
        ),
      );
    await act(renderDraft);
    expect(dom.container.textContent).toContain('Installed browser');
    expect(dom.container.textContent).toContain('Hidden chat');
    const firstKey = getChatPaneStore().activeKey;
    dispatchChatPane(firstKey, { type: 'toggle', pane: 'files' });

    mock.workspaceRoot = '/projects/second';
    await act(renderDraft);
    expect(dom.container.textContent).toBe('Visible chat');
    const secondKey = getChatPaneStore().activeKey;
    expect(secondKey).not.toBe(firstKey);
    expect(getChatPaneStore().byKey[firstKey]?.pane).toBe('files');
    expect(getChatPaneStore().byKey[secondKey]).toBeUndefined();
    await act(async () => root.unmount());
  });

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
            createElement(Route, {
              path: '/chat/:sessionId',
              element: createElement(WorkspaceTabs),
            }),
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
