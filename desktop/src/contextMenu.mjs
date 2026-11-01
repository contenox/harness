export function contextMenuTemplate(params, { copyLink } = {}) {
  const items = [];
  if (params.isEditable) {
    items.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' });
  } else if (params.selectionText) {
    items.push({ role: 'copy' });
  }
  items.push({ role: 'selectAll' });
  if (params.linkURL && copyLink) {
    items.push(
      { type: 'separator' },
      { label: 'Copy Link Address', click: () => copyLink(params.linkURL) },
    );
  }
  return items;
}
