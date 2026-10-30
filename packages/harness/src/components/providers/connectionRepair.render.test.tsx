import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { connectionFromBackend } from '../../lib/chatRecovery';
import type { Backend, Connection } from '../../lib/types';
import { ChatFailureRecovery } from '../../pages/chat/components/ChatFailureRecovery';
import { OtherProvidersPanel } from '../setup/OtherProvidersPanel';
import { ConnectionRepair } from './ConnectionRepair';

vi.mock('../../lib/api', () => ({ api: {} }));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const render = (node: ReactElement) =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(MemoryRouter, null, node),
    ),
  );

const connection: Connection = {
  id: 'c1',
  name: 'anthropic',
  providerType: 'anthropic',
  baseUrl: 'https://api.anthropic.com',
  configState: 'configured',
  authState: 'not_required',
  health: 'unavailable',
  errorCode: 'unauthorized',
  error: '401 invalid x-api-key',
  secretSource: 'literal',
  secretConfigured: true,
  secretPresent: true,
  modelCount: 0,
};

describe('ConnectionRepair', () => {
  it('maps the error code to the card with check and key replacement', () => {
    const html = render(<ConnectionRepair connection={connection} />);
    expect(html).toContain('Anthropic rejected the key');
    expect(html).toContain('Replace key');
    expect(html).toContain('Check again');
    expect(html.indexOf('401 invalid')).toBeGreaterThan(html.indexOf('Technical details'));
  });

  it('offers only a check for a raw backend type that has no setup form', () => {
    const backend: Backend = {
      id: 'b1',
      name: 'local-ai',
      baseUrl: 'http://gpu:8000',
      type: 'local-ai',
      models: [],
      pulledModels: [],
      error: 'dial tcp refused',
      errorCode: 'unreachable',
    };
    const html = render(<ConnectionRepair connection={connectionFromBackend(backend)} />);
    expect(html).toContain('Check again');
    expect(html).not.toContain('>Configure<');
  });

  it('uses the fallback code for a healthy connection when forced', () => {
    const healthy = { ...connection, health: 'available' as const, errorCode: undefined };
    const html = render(
      <ConnectionRepair
        connection={healthy}
        force
        fallbackCode="model_unavailable"
        onChooseModel={() => undefined}
      />,
    );
    expect(html).toContain('Default model unavailable');
    expect(html).toContain('Choose model');
  });

  it('shows the sign-in action for a ChatGPT connection', () => {
    const codex: Connection = {
      ...connection,
      providerType: 'openai-codex',
      name: 'openai-codex',
      authState: 'login_required',
      errorCode: 'login_required',
    };
    expect(render(<ConnectionRepair connection={codex} />)).toContain('Sign in with ChatGPT');
  });
});

describe('ChatFailureRecovery', () => {
  it('keeps the plain fallback for failures that are not about a connection', () => {
    const html = render(
      <ChatFailureRecovery kind="workspace_required" fallback={<p>plain-fallback</p>} />,
    );
    expect(html).toContain('plain-fallback');
  });

  it('keeps the fallback while no connection can be identified', () => {
    const html = render(
      <ChatFailureRecovery kind="backend_unreachable" fallback={<p>plain-fallback</p>} />,
    );
    expect(html).toContain('plain-fallback');
  });
});

describe('OtherProvidersPanel', () => {
  it('shows back, heading and subtitle above the provider list', () => {
    const html = render(
      <OtherProvidersPanel onBack={() => undefined} onConnected={() => undefined} />,
    );
    expect(html).toContain('max-w-md');
    expect(html).toContain('Back');
    expect(html).toContain('Connect a provider');
    expect(html).toContain('Choose a provider to use models in Contenox.');
  });
});
