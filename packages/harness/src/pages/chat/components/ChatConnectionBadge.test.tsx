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

describe('ChatConnectionBadge — extracted chat header content', () => {
  it('renders the connection status and the active session’s own agent', () => {
    mock.workspace = {
      status: 'ready',
      agentName: 'contenox',
      activeSessionId: 'sess-1',
      sessions: [{ sessionId: 'sess-1', _meta: { [AGENT_META_KEY]: 'researcher' } }],
    };
    const html = render();
    expect(html).toContain('Connected');
    expect(html).toContain('researcher');
    expect(html).not.toContain('contenox');
  });

  it('falls back to the workspace agent on the empty surface (no active session)', () => {
    mock.workspace = {
      status: 'ready',
      agentName: 'contenox',
      activeSessionId: null,
      sessions: [],
    };
    const html = render();
    expect(html).toContain('Connected');
    expect(html).toContain('contenox');
  });

  it('is a compact chip, not a page header — no title, <h2>, or <header>', () => {
    mock.workspace = { status: 'ready', agentName: null, activeSessionId: null, sessions: [] };
    const html = render();
    expect(html).toContain('Connected');
    expect(html).not.toContain('beam');
    expect(html).not.toContain('<h2');
    expect(html).not.toContain('<header');
  });

  it('reflects a non-ready status (e.g. reconnecting)', () => {
    mock.workspace = { status: 'reconnecting', agentName: null, activeSessionId: null, sessions: [] };
    const html = render();
    expect(html).toContain('Reconnecting');
  });
});
