import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import type { RankedItem } from '../../lib/palette/paletteState';
import { Highlighted, PaletteOverlay, type PaletteOverlayProps } from './PaletteOverlay';


beforeAll(async () => {
  await i18n.changeLanguage('en');
});

const noop = vi.fn();

const baseProps = (results: RankedItem[], selected = 0): PaletteOverlayProps => ({
  query: '',
  results,
  selected,
  onQueryChange: noop,
  onArrow: noop,
  onEnter: noop,
  onEscape: noop,
  onHover: noop,
  onExecute: noop,
  onClose: noop,
});

const row = (over: Partial<RankedItem['item']> & { id: string }, matchIndexes: number[] = []): RankedItem => ({
  item: { type: 'mission', title: over.id, icon: null, action: () => {}, ...over },
  score: 1,
  matchIndexes,
});

describe('PaletteOverlay', () => {
  it('renders a titled row with its type badge', () => {
    const html = renderToStaticMarkup(
      createElement(PaletteOverlay, baseProps([row({ id: 'mission:1', title: 'Deploy the thing', type: 'mission' })])),
    );
    expect(html).toContain('Deploy the thing');
    expect(html).toContain('Mission');
    expect(html).toContain('role="option"');
  });

  it('renders the empty state when there are no results', () => {
    const html = renderToStaticMarkup(createElement(PaletteOverlay, baseProps([])));
    expect(html).toContain('No matches');
  });

  it('renders the placeholder and footer hints', () => {
    const html = renderToStaticMarkup(createElement(PaletteOverlay, baseProps([])));
    expect(html).toContain('Search missions, agents, sessions, actions');
    expect(html).toContain('Navigate');
  });

  it('marks the selected row as aria-selected', () => {
    const html = renderToStaticMarkup(
      createElement(
        PaletteOverlay,
        baseProps([row({ id: 'a', title: 'Alpha' }), row({ id: 'b', title: 'Beta' })], 1),
      ),
    );
    expect(html).toMatch(/id="palette-opt-1"[^>]*aria-selected="true"/);
  });
});

describe('Highlighted', () => {
  it('wraps matched characters in a mark and leaves the rest plain', () => {
    const html = renderToStaticMarkup(createElement(Highlighted, { text: 'Researcher', indexes: [0, 1, 2] }));
    expect(html).toContain('<mark');
    expect(html).toContain('Res');
    expect(html).toContain('earcher');
  });

  it('emits no mark when there are no indexes', () => {
    const html = renderToStaticMarkup(createElement(Highlighted, { text: 'Plain', indexes: [] }));
    expect(html).not.toContain('<mark');
    expect(html).toContain('Plain');
  });
});
