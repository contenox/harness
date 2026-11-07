import '../../test/fakeDomGlobals';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { clickOn, findAll, fireEvent, installFakeDom, type FakeDomHandle, type FakeNode } from '../../test/fakeDom';
import { ProjectsSection } from './ProjectsSection';
import type { SessionGroups } from './sessionGroups';

let dom: FakeDomHandle;

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  dom = installFakeDom();
});
afterEach(() => dom.uninstall());

const groups: SessionGroups = {
  projects: [
    { root: { path: 'C:/code/alpha', default: false, name: 'alpha' }, sessions: [] },
    { root: { path: 'C:/code/beta', default: false, name: 'beta' }, sessions: [] },
  ],
  other: [],
};

const menuItems = () =>
  findAll(dom.document.body, n => n.getAttribute('role') === 'menuitem');

const mouseDownOnDocument = (target: FakeNode) => {
  for (const listener of [...(dom.document.listeners.mousedown ?? [])]) listener.fn({ target });
};

async function renderSection(onOpenPermissions: (path: string) => void) {
  const root = createRoot(dom.container as unknown as Element);
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        null,
        createElement(ProjectsSection, {
          groups,
          loading: false,
          activeSessionId: undefined,
          pendingPermission: () => false,
          isGroupOpen: () => true,
          onToggleGroup: () => undefined,
          onNavigate: () => undefined,
          onDeleteSession: () => undefined,
          onNewProject: () => undefined,
          onNewSessionIn: () => undefined,
          onOpenPermissions,
          onRenameProject: () => undefined,
          onRemoveProject: () => undefined,
          removeFailed: false,
        }),
      ),
    );
  });
  return root;
}

describe('ProjectsSection context menu', () => {
  it('keeps the menu open on a mousedown inside it when other projects have their own menus', async () => {
    const onOpenPermissions = vi.fn();
    await renderSection(onOpenPermissions);

    const row = findAll(dom.container, n => n.getAttribute('title') === 'alpha')[0];
    expect(row).toBeDefined();
    await act(async () => fireEvent(dom.container, row, 'contextmenu', { button: 2 }));

    const permissions = menuItems()[0];
    expect(permissions, 'the menu opened').toBeDefined();

    await act(async () => mouseDownOnDocument(permissions));
    expect(menuItems().length, 'a mousedown on a menu item does not close the menu').toBeGreaterThan(0);

    await act(async () => clickOn(dom.document.body, permissions, fn => fn()));
    expect(onOpenPermissions).toHaveBeenCalledWith('C:/code/alpha');
  });

  it('closes the menu on a mousedown elsewhere', async () => {
    await renderSection(() => undefined);
    const row = findAll(dom.container, n => n.getAttribute('title') === 'alpha')[0];
    await act(async () => fireEvent(dom.container, row, 'contextmenu', { button: 2 }));
    expect(menuItems().length).toBeGreaterThan(0);

    await act(async () => mouseDownOnDocument(dom.document.body));
    expect(menuItems().length).toBe(0);
  });
});
