import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { AGENT_META_KEY } from '../../../lib/acp';
import { ChatConnectionBadge } from './ChatConnectionBadge';

const mock = vi.hoisted(() => ({ workspace: null as unknown }));
vi.mock('../../../hooks/useAcpWorkspace', () => ({
  useAcpWorkspace: () => ({ workspace: mock.workspace, sessions: { slices: {} } }),
}));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

function render(): string {
  return renderToStaticMarkup(createElement(ChatConnectionBadge));
}

describe('ChatConnectionBadge', () => {
  it('renders nothing while the connection is healthy — no agent name, no pill', () => {
    mock.workspace = {
      status: 'ready',
      agentName: 'contenox',
      activeSessionId: 'sess-1',
      sessions: [{ sessionId: 'sess-1', _meta: { [AGENT_META_KEY]: 'researcher' } }],
    };
    expect(render()).toBe('');
  });

  it('never prints the agent name next to the pane toggles, even on the empty surface', () => {
    mock.workspace = { status: 'ready', agentName: 'contenox', activeSessionId: null, sessions: [] };
    expect(render()).not.toContain('contenox');
  });

  it('reflects a reconnecting status', () => {
    mock.workspace = { status: 'reconnecting', agentName: 'contenox', activeSessionId: null, sessions: [] };
    const html = render();
    expect(html).toContain('Reconnecting');
    expect(html).not.toContain('contenox');
  });

  it('shows an error pill only when the connection is broken', () => {
    mock.workspace = { status: 'error', agentName: null, activeSessionId: null, sessions: [] };
    expect(render()).toContain('Error');
    mock.workspace = { status: 'disconnected', agentName: null, activeSessionId: null, sessions: [] };
    expect(render()).toContain('Disconnected');
  });
});
