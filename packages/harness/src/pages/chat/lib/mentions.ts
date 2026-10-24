import { imageContent, textContent, type ContentBlock } from '../../../lib/acp';
import type { PendingImageAttachment } from './imageAttachments';

export interface WorkspaceFileRef {
  path: string;
  name: string;
}

export interface MentionCandidate extends WorkspaceFileRef {
  isDirectory: boolean;
}

export interface MentionQuery {
  active: boolean;
  query: string;
  start: number;
  end: number;
}

const MENTION_TOKEN_RE = /(^|\s)@(?:"([^"]*)|([\w./-]*))$/;

export function deriveMentionQuery(text: string, caret: number): MentionQuery {
  const upto = text.slice(0, Math.max(0, Math.min(caret, text.length)));
  const m = MENTION_TOKEN_RE.exec(upto);
  if (!m) return { active: false, query: '', start: caret, end: caret };
  const quoted = m[2] !== undefined;
  const query = (quoted ? m[2] : m[3]) ?? '';
  const start = upto.length - query.length - (quoted ? 2 : 1);
  return { active: true, query, start, end: upto.length };
}

function needsQuoting(path: string): boolean {
  return /\s/.test(path);
}

export function mentionToken(file: WorkspaceFileRef): string {
  return needsQuoting(file.path) ? `@"${file.path}"` : `@${file.path}`;
}

export function splitMentionQuery(query: string): { dir: string; leaf: string } {
  const slash = query.lastIndexOf('/');
  if (slash === -1) return { dir: '', leaf: query };
  return { dir: query.slice(0, slash), leaf: query.slice(slash + 1) };
}

export function mentionCandidatesForScope(entries: MentionCandidate[], leaf: string): MentionCandidate[] {
  const q = leaf.trim().toLowerCase();
  const scored = entries
    .map(e => {
      const name = e.name.toLowerCase();
      if (q === '') return { e, rank: 0 };
      if (name.startsWith(q)) return { e, rank: 0 };
      if (name.includes(q)) return { e, rank: 1 };
      return null;
    })
    .filter((x): x is { e: MentionCandidate; rank: number } => x !== null);
  scored.sort(
    (a, b) =>
      Number(b.e.isDirectory) - Number(a.e.isDirectory) ||
      a.rank - b.rank ||
      a.e.name.localeCompare(b.e.name),
  );
  return scored.map(x => x.e);
}

function queryScope(query: string): string {
  return splitMentionQuery(query).dir;
}

function parentDir(dir: string): string {
  const slash = dir.lastIndexOf('/');
  return slash === -1 ? '' : dir.slice(0, slash);
}

function browseToken(dir: string): string {
  if (dir === '') return '@';
  const inner = `${dir}/`;
  return needsQuoting(inner) ? `@"${inner}` : `@${inner}`;
}

export function applyMentionFolder(text: string, q: MentionQuery, dir: WorkspaceFileRef): { text: string; caret: number } {
  const token = browseToken(dir.path);
  const next = text.slice(0, q.start) + token + text.slice(q.end);
  return { text: next, caret: q.start + token.length };
}

export function applyMentionAscend(text: string, q: MentionQuery): { text: string; caret: number } {
  const token = browseToken(parentDir(queryScope(q.query)));
  const next = text.slice(0, q.start) + token + text.slice(q.end);
  return { text: next, caret: q.start + token.length };
}

export type MentionMenuKeyAction =
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'drill' }
  | { type: 'ascend' }
  | { type: 'accept' }
  | { type: 'close' };

export function mentionMenuKeyFromEvent(key: string): MentionMenuKeyAction | null {
  switch (key) {
    case 'ArrowDown':
      return { type: 'move', delta: 1 };
    case 'ArrowUp':
      return { type: 'move', delta: -1 };
    case 'ArrowRight':
      return { type: 'drill' };
    case 'ArrowLeft':
      return { type: 'ascend' };
    case 'Tab':
    case 'Enter':
      return { type: 'accept' };
    case 'Escape':
      return { type: 'close' };
    default:
      return null;
  }
}

export function mentionPreviewPath(entries: MentionCandidate[], activeIndex: number): string | null {
  const entry = entries[activeIndex];
  if (!entry || entry.isDirectory) return null;
  return entry.path;
}

export function filterMentionFiles(files: WorkspaceFileRef[], query: string): WorkspaceFileRef[] {
  const q = query.trim().toLowerCase();
  if (q === '') return files;
  const scored = files
    .map(f => {
      const name = f.name.toLowerCase();
      const path = f.path.toLowerCase();
      if (name.startsWith(q)) return { f, rank: 0 };
      if (path.startsWith(q)) return { f, rank: 1 };
      if (name.includes(q) || path.includes(q)) return { f, rank: 2 };
      return null;
    })
    .filter((x): x is { f: WorkspaceFileRef; rank: number } => x !== null);
  scored.sort((a, b) => a.rank - b.rank || a.f.path.localeCompare(b.f.path));
  return scored.map(x => x.f);
}

export function applyMention(text: string, q: MentionQuery, file: WorkspaceFileRef): { text: string; caret: number } {
  const token = `${mentionToken(file)} `;
  const next = text.slice(0, q.start) + token + text.slice(q.end);
  return { text: next, caret: q.start + token.length };
}

export function activeMentions(text: string, selected: WorkspaceFileRef[]): WorkspaceFileRef[] {
  const seen = new Set<string>();
  const out: WorkspaceFileRef[] = [];
  for (const f of selected) {
    if (seen.has(f.path)) continue;
    if (!text.includes(mentionToken(f))) continue;
    seen.add(f.path);
    out.push(f);
  }
  return out;
}

export function promptBlocksFromDraft(
  text: string,
  mentions: WorkspaceFileRef[],
  images: PendingImageAttachment[] = [],
): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  if (text.trim() !== '') blocks.push(textContent(text));
  const seen = new Set<string>();
  for (const m of mentions) {
    if (seen.has(m.path)) continue;
    seen.add(m.path);
    blocks.push({ type: 'resource_link', name: m.path, uri: m.path });
  }
  for (const img of images) {
    blocks.push(imageContent(img.data, img.mimeType));
  }
  return blocks;
}
