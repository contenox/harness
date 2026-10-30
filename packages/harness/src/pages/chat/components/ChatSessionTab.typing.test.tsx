import '../../../test/fakeDomGlobals';
import { createElement, Profiler, type ProfilerOnRenderCallback } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialAcpSessionState, type AcpSessionState } from '../../../hooks/acpSessionState';
import i18n from '../../../i18n';
import { SlashCommandRegistryProvider } from '../../../lib/slashCommands';
import { findAll, installFakeDom, typeInto, type FakeDomHandle } from '../../../test/fakeDom';
import { resetChatPaneStore } from '../../../hooks/chatPaneStore';

const mock = vi.hoisted(() => ({
  chatMessageRenders: 0,
  toolCardRenders: 0,
  session: null as unknown,
}));

// Count real transcript item renders without replacing them.
vi.mock('@contenox/ui', async importOriginal => {
  const actual = await importOriginal<typeof import('@contenox/ui')>();
  return {
    ...actual,
    ChatMessage: (props: Parameters<typeof actual.ChatMessage>[0]) => {
      mock.chatMessageRenders += 1;
      return actual.ChatMessage(props);
    },
    ToolCallCard: (props: Parameters<typeof actual.ToolCallCard>[0]) => {
      mock.toolCardRenders += 1;
      return actual.ToolCallCard(props);
    },
  };
});

vi.mock('../../../hooks/useAcpWorkspace', () => {
  // Everything stable, like the real context between unrelated renders.
  const fns = {
    newSession: vi.fn(),
    sendPrompt: vi.fn(),
    runTerminal: vi.fn(),
    respondPermission: vi.fn(),
    cancel: vi.fn(),
    setConfigOption: vi.fn(),
    applyConfigOptions: vi.fn(),
  };
  const workspace = {
    status: 'ready',
    agentName: 'agent-x',
    sessions: [{ sessionId: 's1', cwd: 'C:/proj' }],
    workspaceConfigOptions: [],
    promptCapabilities: {},
  };
  return {
    useAcpWorkspace: () => ({ ...fns, workspace, sessions: { slices: { s1: mock.session } } }),
  };
});
vi.mock('../../../hooks/useSetupStatus', () => {
  const result = { refetch: vi.fn() };
  return { useSetupStatus: () => result };
});
vi.mock('../../../hooks/useWorkspaceRoots', () => {
  const result = { roots: [] };
  return { useWorkspaceRoots: () => result };
});
vi.mock('../../../hooks/useWorkspaceFiles', () => {
  // Stable callbacks like the real hook; only the result object is fresh per render.
  const stable = {
    cache: {},
    files: [],
    isLoading: () => false,
    ensureLoaded: () => {},
    refresh: () => {},
    readFile: async (path: string) => ({ path, text: '', isBinary: false }),
    setAgentView: () => {},
  };
  return {
    useWorkspaceFiles: () => ({ ...stable, rootLoading: false, error: null, agentView: false, hitlPolicyName: null }),
  };
});
vi.mock('../../../lib/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('../../../components/workspace/NewProjectDialog', () => ({ NewProjectDialog: () => null }));
vi.mock('./TerminalPane', () => ({ TerminalPane: () => null }));
vi.mock('./FilesPane', () => ({ FilesPane: () => null }));
vi.mock('./DiffPane', () => ({ DiffPane: () => null }));

const { ChatSessionTab } = await import('./ChatSessionTab');

const TURNS = Number(process.env.TURNS ?? 150); // 300 timeline items: user message + assistant message per turn

function longSession(): AcpSessionState {
  const items: AcpSessionState['items'] = [];
  const messages: AcpSessionState['messages'] = {};
  for (let i = 0; i < TURNS; i++) {
    const u = `u${i}`;
    const a = `a${i}`;
    items.push({ kind: 'message', id: u, turnId: `t${i}` }, { kind: 'message', id: a, turnId: `t${i}` });
    messages[u] = { id: u, role: 'user', text: `question ${i}` };
    messages[a] = {
      id: a,
      role: 'assistant',
      text: `### Answer ${i}\n\nSome **markdown** with \`code\` and a list:\n\n- one\n- two\n- three\n`,
    };
  }
  return { ...initialAcpSessionState, sessionId: 's1', items, messages };
}

let dom: FakeDomHandle;

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  dom = installFakeDom();
  resetChatPaneStore();
  mock.session = longSession();
  mock.chatMessageRenders = 0;
  mock.toolCardRenders = 0;
});
afterEach(() => dom.uninstall());

describe('ChatSessionTab typing performance', () => {
  it('typing into the composer re-renders none of the 300 transcript items', async () => {
    const commits: Array<{ id: string; duration: number }> = [];
    const onRender: ProfilerOnRenderCallback = (id, _phase, actualDuration) => {
      commits.push({ id, duration: actualDuration });
    };
    const root = createRoot(dom.container as unknown as Element);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          null,
          createElement(
            SlashCommandRegistryProvider,
            null,
            createElement(
              Profiler,
              { id: 'chat', onRender },
              createElement(ChatSessionTab, { sessionId: 's1', onSessionCreated: () => {} }),
            ),
          ),
        ),
      );
    });

    const textarea = findAll(dom.container, n => n.tagName === 'TEXTAREA')[0];
    expect(textarea).toBeDefined();
    expect(mock.chatMessageRenders).toBeGreaterThanOrEqual(TURNS * 2);

    const rendersBefore = mock.chatMessageRenders;
    const commitsBefore = commits.length;
    const typed = 'hello world, typing!!';
    const startedAt = performance.now();
    typeInto(dom.container, textarea, typed.slice(0, 20), fn => {
      void act(fn);
    });
    const elapsed = performance.now() - startedAt;

    expect(textarea.value).toBe(typed.slice(0, 20));
    const typingCommits = commits.slice(commitsBefore);
    const totalActual = typingCommits.reduce((s, c) => s + c.duration, 0);
    // Reported for before/after comparisons; the assertion below is the regression guard.
    console.info(
      `[typing] message renders while typing 20 chars: ${mock.chatMessageRenders - rendersBefore}; ` +
        `commits: ${typingCommits.length}; React actualDuration sum: ${totalActual.toFixed(1)}ms; wall: ${elapsed.toFixed(1)}ms`,
    );
    expect(mock.chatMessageRenders - rendersBefore).toBe(0);
    expect(mock.toolCardRenders).toBe(0);

    await act(async () => root.unmount());
  });
});
