import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { getCloudProviderSetup } from '../../lib/providerCatalog';
import type { Connection } from '../../lib/types';
import { ConnectionRecovery } from './ConnectionRecovery';
import { ConnectionRow } from './ConnectionRow';
import { ProviderSetupForm } from './ProviderSetupForm';

vi.mock('../../lib/api', () => ({ api: {} }));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const connection: Connection = {
  id: 'c1',
  name: 'ollama',
  providerType: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  configState: 'configured',
  authState: 'not_required',
  health: 'unavailable',
  errorCode: 'unreachable',
  error: 'dial tcp 127.0.0.1:11434: connection refused',
  secretSource: 'none',
  secretConfigured: false,
  secretPresent: false,
  modelCount: 0,
};

const render = (node: ReactElement) =>
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client: new QueryClient() }, node),
  );

describe('ConnectionRecovery', () => {
  it('shows a mapped title and text, with the raw error only in details', () => {
    const html = render(
      <ConnectionRecovery
        connection={connection}
        providerTitle="Ollama"
        onRetry={() => undefined}
        onConfigure={() => undefined}
      />,
    );
    expect(html).toContain('Ollama unreachable');
    expect(html).toContain('127.0.0.1:11434');
    expect(html).toContain('Check again');
    expect(html).toContain('Configure');
    expect(html).toContain('Technical details');
    expect(html.indexOf('dial tcp')).toBeGreaterThan(html.indexOf('Technical details'));
  });

  it('offers only the actions that have a handler', () => {
    const html = render(
      <ConnectionRecovery connection={connection} providerTitle="Ollama" onRetry={() => undefined} />,
    );
    expect(html).toContain('Check again');
    expect(html).not.toContain('>Configure<');
  });

  it('renders nothing for a healthy connection unless forced', () => {
    const healthy = { ...connection, health: 'available' as const, errorCode: undefined };
    expect(render(<ConnectionRecovery connection={healthy} providerTitle="Ollama" />)).toBe('');
    expect(
      render(<ConnectionRecovery force connection={healthy} providerTitle="Ollama" />),
    ).toContain('is not working');
  });
});

describe('ConnectionRow', () => {
  it('shows name, address and status label', () => {
    const html = render(
      <ConnectionRow
        connection={connection}
        onCheck={() => undefined}
        onEdit={() => undefined}
        onRename={() => undefined}
        onDelete={() => undefined}
      />,
    );
    expect(html).toContain('ollama');
    expect(html).toContain('http://127.0.0.1:11434');
    expect(html).toContain('Unreachable');
  });
});

describe('ProviderSetupForm', () => {
  it('asks only for the key up front, with advanced options collapsed', () => {
    const html = render(<ProviderSetupForm setup={getCloudProviderSetup('anthropic')} />);
    expect(html).toContain('API Key');
    expect(html).toContain('Create key');
    expect(html).toContain('https://console.anthropic.com/settings/keys');
    expect(html).toContain('Advanced');
    expect(html).toContain('Connect');
    expect(html).not.toContain('Save<');
  });

  it('prefills the Ollama address', () => {
    const html = render(<ProviderSetupForm setup={getCloudProviderSetup('ollama')} />);
    expect(html).toContain('value="http://127.0.0.1:11434"');
  });

  it('shows stored-secret mode and Save when editing, never the secret', () => {
    const html = render(
      <ProviderSetupForm
        setup={getCloudProviderSetup('anthropic')}
        connection={{
          ...connection,
          providerType: 'anthropic',
          name: 'anthropic',
          baseUrl: 'https://api.anthropic.com',
          health: 'available',
          errorCode: undefined,
          secretSource: 'literal',
          secretConfigured: true,
          secretPresent: true,
        }}
      />,
    );
    expect(html).toContain('API key stored');
    expect(html).toContain('Replace');
    expect(html).toContain('Save');
  });
});
