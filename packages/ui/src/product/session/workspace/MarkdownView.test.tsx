import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MarkdownView from './MarkdownView';

const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

describe('MarkdownView', () => {
  it('decodes raw bytes and renders headings and GFM tables', () => {
    const html = renderToStaticMarkup(
      <MarkdownView
        content={b64('# Plan\n\n| step | done |\n| --- | --- |\n| one | yes |')}
        path="x.md"
        name="x.md"
      />,
    );
    expect(html).toContain('<h1>Plan</h1>');
    expect(html).toContain('<table>');
    expect(html).toContain('>yes<');
  });

  it('never renders raw HTML from the source', () => {
    const html = renderToStaticMarkup(
      <MarkdownView
        content={b64('before\n\n<script>window.pwned = 1</script>\n\nafter')}
        path="x.md"
        name="x.md"
      />,
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('before');
    expect(html).toContain('after');
  });
});
