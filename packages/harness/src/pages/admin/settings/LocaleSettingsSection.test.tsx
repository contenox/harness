import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { LocaleSettingsSection } from './LocaleSettingsSection';

vi.mock('../../../lib/api', () => ({ api: {} }));

const render = () =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(LocaleSettingsSection),
    ),
  );

describe('LocaleSettingsSection', () => {
  it('renders the English labels', async () => {
    await i18n.changeLanguage('en');
    const html = render();
    expect(html).toContain('Language');
    expect(html).toContain('Locale');
    expect(html).toContain('name="locale"');
    expect(html).toContain('A running session keeps the language it started with.');
  });

  it('renders the German labels', async () => {
    await i18n.changeLanguage('de');
    const html = render();
    expect(html).toContain('Sprache');
    expect(html).toContain('Gebietsschema');
    expect(html).toContain('name="locale"');
  });
});

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
