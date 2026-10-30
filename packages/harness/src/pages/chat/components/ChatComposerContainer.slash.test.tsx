import '../../../test/fakeDomGlobals';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { findAll, installFakeDom, typeInto, type FakeDomHandle } from '../../../test/fakeDom';
import type { AvailableCommand, SessionConfigOption } from '../../../lib/acp';
import type { ComposerFiles } from '../hooks/useComposerController';
import { ChatComposerContainer } from './ChatComposerContainer';

const COMMANDS: AvailableCommand[] = [
  { name: 'model', description: 'Show the current model, or set it.', input: { hint: '[model-name]' } },
  { name: 'think', description: 'Set the reasoning level.', input: { hint: '[level]' } },
];

const CONFIG_OPTIONS: SessionConfigOption[] = [
  {
    id: 'model',
    name: 'Model',
    type: 'select',
    currentValue: 'connection:d1/deepseek-flash',
    options: [
      {
        group: 'any',
        name: 'Any provider',
        options: [{ value: 'any/deepseek-flash', name: 'deepseek-flash' }],
      },
      {
        group: 'd1',
        name: 'deepseek',
        options: [{ value: 'connection:d1/deepseek-flash', name: 'deepseek-flash' }],
      },
    ],
  },
];

let dom: FakeDomHandle;

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  dom = installFakeDom();
});
afterEach(() => dom.uninstall());

const FILES = {
  cache: {},
  ensureLoaded: () => true,
  isLoading: false,
  readFile: async () => null,
} as unknown as ComposerFiles;

async function renderComposer() {
  const root = createRoot(dom.container as unknown as Element);
  await act(async () => {
    root.render(
      createElement(ChatComposerContainer, {
        files: FILES,
        availableCommands: COMMANDS,
        configOptions: CONFIG_OPTIONS,
        isPrompting: false,
        disabled: false,
        ready: true,
        imagesSupported: false,
        audioSupported: false,
        projectChip: null,
        footerEnd: null,
        onSubmit: async () => {},
        onCancel: () => {},
      }),
    );
  });
  const textarea = findAll(dom.container, n => n.tagName === 'TEXTAREA')[0];
  expect(textarea).toBeDefined();
  return { root, textarea };
}

describe('ChatComposerContainer slash pickers', () => {
  it('lists commands for /', async () => {
    const { root, textarea } = await renderComposer();
    typeInto(dom.container, textarea, '/', fn => {
      void act(fn);
    });
    const commandList = findAll(dom.container, n => n.getAttribute?.('role') === 'listbox')[0];
    expect(commandList?.getAttribute('aria-label')).toBe('Commands');
    await act(async () => root.unmount());
  });

  it('lists provider-qualified model values after /model', async () => {
    const { root, textarea } = await renderComposer();
    typeInto(dom.container, textarea, '/model ', fn => {
      void act(fn);
    });
    const valueList = findAll(dom.container, n => n.getAttribute?.('aria-label') === 'Values for /model')[0];
    expect(valueList).toBeDefined();
    const rows = findAll(valueList, n => n.tagName === 'BUTTON').map(n => n.textContent);
    expect(rows).toContain('deepseek/deepseek-flash');
    await act(async () => root.unmount());
  });

  it('renders the attach-image control as a non-submitting button', async () => {
    const root = createRoot(dom.container as unknown as Element);
    await act(async () => {
      root.render(
        createElement(ChatComposerContainer, {
          files: FILES,
          availableCommands: COMMANDS,
          configOptions: CONFIG_OPTIONS,
          isPrompting: false,
          disabled: false,
          ready: true,
          imagesSupported: true,
          audioSupported: false,
          projectChip: null,
          footerEnd: null,
          onSubmit: async () => {},
          onCancel: () => {},
        }),
      );
    });
    const button = findAll(dom.container, n => n.getAttribute?.('data-testid') === 'composer-attach-image')[0];
    expect(button).toBeDefined();
    expect(button?.getAttribute('type')).toBe('button');
    await act(async () => root.unmount());
  });
});



