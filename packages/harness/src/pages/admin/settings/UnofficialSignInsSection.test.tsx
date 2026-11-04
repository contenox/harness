import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { UnofficialSignInsSection } from './UnofficialSignInsSection';

vi.mock('../../../lib/api', () => ({ api: {} }));

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

describe('UnofficialSignInsSection', () => {
  it('warns before the switch and keeps it off until the config loads', () => {
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(UnofficialSignInsSection),
      ),
    );
    expect(html).toContain('Unofficial sign-ins');
    expect(html).toContain('Use at your own risk');
    expect(html.indexOf('Use at your own risk')).toBeLessThan(
      html.indexOf('Allow unofficial sign-ins'),
    );
    expect(html).toContain('Claude Code offers only Anthropic Console sign-in');
    expect(html).not.toContain('Turn on unofficial sign-ins?');
  });
});
