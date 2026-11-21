import { strFromU8, unzipSync } from 'fflate';

export interface Section {
  name: string;
  paragraphs?: string[];
  rows?: string[][];
}
const nodes = (root: Element | Document, name: string) =>
  Array.from(root.getElementsByTagNameNS('*', name));
const strings = (root: Element, name: string) =>
  nodes(root, name)
    .map(e => e.textContent ?? '')
    .join('');
const attr = (node: Element, name: string) =>
  Array.from(node.attributes).find(a => a.localName === name)?.value;
const limit = (value: string | undefined, max: number) =>
  Math.min(max, Math.max(1, Number.parseInt(value ?? '1', 10) || 1));

function openArchive(data: Uint8Array, ext: string) {
  let total = 0;
  const entries: string[] = [];
  const parts = unzipSync(data, {
    filter(file) {
      entries.push(file.name);
      if (entries.length > 10000) throw new Error('Archive has too many entries');
      if (
        ext === 'zip' ||
        !/^(content\.xml|word\/document\.xml|ppt\/slides\/slide\d+\.xml|xl\/(sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml))$/.test(
          file.name,
        )
      )
        return false;
      total += file.originalSize;
      if (total > 24 * 1024 * 1024) throw new Error('Document exceeds the preview limit');
      return true;
    },
  });
  const xml = (path: string) => {
    if (!parts[path]) throw new Error('Missing document part');
    const doc = new DOMParser().parseFromString(strFromU8(parts[path]), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid document XML');
    return doc;
  };
  return { xml, entries, parts };
}

type OfficeArchive = ReturnType<typeof openArchive>;

function readWorkbook({ xml, parts }: OfficeArchive): Section[] {
  const shared = parts['xl/sharedStrings.xml']
    ? nodes(xml('xl/sharedStrings.xml'), 'si').map(e => strings(e, 't'))
    : [];
  const relations = new Map(
    nodes(xml('xl/_rels/workbook.xml.rels'), 'Relationship').map(e => [
      e.getAttribute('Id'),
      e.getAttribute('Target') ?? '',
    ]),
  );
  return nodes(xml('xl/workbook.xml'), 'sheet').map(sheet => {
    const target = relations.get(attr(sheet, 'id') ?? '') ?? '';
    const part = new URL(target, 'https://document.invalid/xl/workbook.xml').pathname.slice(1);
    const rows = nodes(xml(part), 'row')
      .slice(0, 500)
      .map(row => {
        const cells: string[] = [];
        for (const cell of nodes(row, 'c')) {
          const column = (cell.getAttribute('r')?.match(/^[A-Z]+/i)?.[0] ?? '').toUpperCase();
          const idx = column
            ? [...column].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1
            : cells.length;
          if (idx >= 100) continue;
          const type = cell.getAttribute('t');
          const value = strings(cell, 'v');
          while (cells.length < idx) cells.push('');
          cells[idx] =
            type === 's'
              ? (shared[Number(value)] ?? '')
              : type === 'inlineStr'
                ? strings(cell, 't')
                : value || (nodes(cell, 'f')[0] ? '=' + strings(cell, 'f') : '');
        }
        return cells;
      });
    return { name: sheet.getAttribute('name') ?? '', rows };
  });
}

function readOpenDocumentSheets(doc: Document): Section[] {
  return nodes(doc, 'table').map(sheet => {
    const rows: string[][] = [];
    for (const row of nodes(sheet, 'table-row')) {
      const cells: string[] = [];
      for (const cell of Array.from(row.children)) {
        if (cell.localName !== 'table-cell' && cell.localName !== 'covered-table-cell') continue;
        const value = nodes(cell, 'p')
          .map(p => p.textContent ?? '')
          .join('\n');
        for (
          let i = 0;
          i < limit(attr(cell, 'number-columns-repeated'), 100) && cells.length < 100;
          i++
        )
          cells.push(value);
      }
      for (let i = 0; i < limit(attr(row, 'number-rows-repeated'), 500) && rows.length < 500; i++)
        rows.push(cells);
      if (rows.length === 500) break;
    }
    return { name: attr(sheet, 'name') ?? '', rows };
  });
}

export function readOffice(data: Uint8Array, ext: string): Section[] {
  const archive = openArchive(data, ext);
  const { xml, entries, parts } = archive;
  if (ext === 'zip') return [{ name: 'ZIP', paragraphs: entries.slice(0, 1000) }];
  if (ext === 'docx' || ext === 'docm')
    return [
      {
        name: 'Word',
        paragraphs: nodes(xml('word/document.xml'), 'p')
          .slice(0, 3000)
          .map(e => strings(e, 't')),
      },
    ];
  if (ext === 'pptx' || ext === 'pptm')
    return Object.keys(parts)
      .filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((p, i) => ({
        name: String(i + 1),
        paragraphs: nodes(xml(p), 'p').map(e => strings(e, 't')),
      }));
  if (ext === 'xlsx' || ext === 'xlsm') return readWorkbook(archive);
  const doc = xml('content.xml');
  if (ext === 'ods') return readOpenDocumentSheets(doc);
  if (ext === 'odp')
    return nodes(doc, 'page').map((p, i) => ({
      name: attr(p, 'name') ?? String(i + 1),
      paragraphs: nodes(p, 'p').map(e => e.textContent ?? ''),
    }));
  return [
    {
      name: 'OpenDocument',
      paragraphs: Array.from(doc.getElementsByTagName('*'))
        .filter(e => e.localName === 'p' || e.localName === 'h')
        .slice(0, 3000)
        .map(e => e.textContent ?? ''),
    },
  ];
}

export function readDelimited(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && (quoted || value === '')) {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && c === separator) {
      row.push(value);
      value = '';
    } else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(value);
      rows.push(row.slice(0, 100));
      row = [];
      value = '';
      if (rows.length >= 500) break;
    } else value += c;
  }
  if (rows.length < 500 && (value || row.length)) {
    row.push(value);
    rows.push(row.slice(0, 100));
  }
  return rows;
}
