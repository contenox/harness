import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import type { RequestPermissionRequest } from '../../../lib/acp';
import { PermissionCard } from './PermissionCard';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

function permissionRequest(sessionId: string, toolCallId: string, title: string): RequestPermissionRequest {
  return {
    sessionId,
    toolCall: {
      toolCallId,
      title,
      kind: 'edit',
      content: [{ type: 'diff', path: 'src/config.ts', oldText: 'const a = 1;', newText: 'const a = 2;' }],
      rawInput: { path: 'src/config.ts' },
    },
    options: [
      { optionId: 'allow-1', name: 'Allow once', kind: 'allow_once' },
      { optionId: 'deny-1', name: 'Deny once', kind: 'reject_once' },
    ],
  };
}

function render(node: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(node);
}

describe('PermissionCard', () => {
  it('(a) renders the pending request inline as a card — heading, tool title, diff, and both option buttons', () => {
    const req = permissionRequest('sess-1', 'call-1', 'Edit config');
    const html = render(createElement(PermissionCard, { permission: req, onRespond: vi.fn() }));

    expect(html).toContain('Permission required');
    expect(html).toContain('Edit config');
    expect(html).toContain('const a = 1;');
    expect(html).toContain('const a = 2;');
    expect(html).toContain('src/config.ts');
    expect(html).toContain('Allow once');
    expect(html).toContain('Deny once');
    expect(html).toContain('role="group"');
  });

  it('(b) exposes no overlay/backdrop/dismiss surface and never responds merely by rendering', () => {
    const req = permissionRequest('sess-1', 'call-1', 'Edit config');
    const onRespond = vi.fn();
    const html = render(createElement(PermissionCard, { permission: req, onRespond }));

    expect(html).not.toContain('role="alertdialog"');
    expect(html).not.toContain('aria-modal');
    expect(html).not.toContain('fixed inset-0');
    expect(onRespond).not.toHaveBeenCalled();
  });

  it('(d) two concurrent sessions each render their own independent card', () => {
    const reqA = permissionRequest('sess-a', 'call-a', 'Edit A');
    const reqB = permissionRequest('sess-b', 'call-b', 'Edit B');
    const htmlA = render(createElement(PermissionCard, { permission: reqA, onRespond: vi.fn() }));
    const htmlB = render(createElement(PermissionCard, { permission: reqB, onRespond: vi.fn() }));

    expect(htmlA).toContain('Edit A');
    expect(htmlA).not.toContain('Edit B');
    expect(htmlB).toContain('Edit B');
    expect(htmlB).not.toContain('Edit A');
  });
});
