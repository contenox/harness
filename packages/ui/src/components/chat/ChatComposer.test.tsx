import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChatComposer } from './ChatComposer';

function render(props: Partial<React.ComponentProps<typeof ChatComposer>> = {}) {
  return renderToStaticMarkup(
    createElement(ChatComposer, {
      value: '',
      onChange: () => {},
      onSubmit: () => {},
      ...props,
    }),
  );
}

function buttonFor(html: string, label: string): string {
  return html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? '';
}

describe('ChatComposer submit control', () => {
  it('renders Stop as its own enabled button while the composer is disabled', () => {
    const html = render({
      disabled: true,
      submitLabel: 'Stop',
      submitIcon: createElement('span', { 'data-testid': 'stop-icon' }),
      onStop: () => {},
    });
    const button = buttonFor(html, 'Stop');
    expect(button).not.toBe('');
    expect(button).toContain('type="button"');
    // Utility classes contain "disabled:"; only a real disabled attribute counts.
    expect(button).not.toMatch(/\sdisabled(?:[= >])/);
    expect(html).toContain('data-testid="stop-icon"');
  });

  it('keeps Send as a disabled submit button when the composer is disabled', () => {
    const html = render({ disabled: true, submitLabel: 'Send' });
    const button = buttonFor(html, 'Send');
    expect(button).toContain('type="submit"');
    expect(button).toMatch(/\sdisabled(?:[= >])/);
  });

  it('uses the up arrow when no stop icon is supplied', () => {
    const html = render({ submitLabel: 'Send' });
    expect(html).toContain('lucide-arrow-up');
  });
});
