import assert from 'node:assert/strict';
import test from 'node:test';
import { contextMenuTemplate } from './contextMenu.mjs';

test('selected text offers copy and select all', () => {
  const items = contextMenuTemplate({ selectionText: 'hello', isEditable: false });

  assert.deepEqual(items, [{ role: 'copy' }, { role: 'selectAll' }]);
});

test('editable fields offer cut, copy and paste', () => {
  const items = contextMenuTemplate({ selectionText: '', isEditable: true });

  assert.deepEqual(
    items.map(item => item.role),
    ['cut', 'copy', 'paste', 'selectAll'],
  );
});

test('a click without a selection still offers select all', () => {
  const items = contextMenuTemplate({ selectionText: '', isEditable: false });

  assert.deepEqual(items, [{ role: 'selectAll' }]);
});

test('a link adds a copy-link action that hands the URL to the caller', () => {
  const copied = [];
  const items = contextMenuTemplate(
    { selectionText: '', isEditable: false, linkURL: 'https://contenox.com/docs' },
    { copyLink: url => copied.push(url) },
  );

  const linkItem = items.find(item => item.label === 'Copy Link Address');
  assert.ok(linkItem);
  linkItem.click();
  assert.deepEqual(copied, ['https://contenox.com/docs']);
});
