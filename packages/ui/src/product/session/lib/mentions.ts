
import { audioContent, imageContent, textContent, type ContentBlock } from '@contenox/acp-client';
import type { PendingAudioAttachment } from './audioAttachments';
import type { PendingImageAttachment } from './imageAttachments';

/**
 * A workspace file the user can mention: its root-relative path and display name.
 */
export interface WorkspaceFileRef {
  /**
   * Path relative to the session workspace root (what `local_fs` resolves).
   */
  path: string;
  /**
   * Display name (basename).
   */
  name: string;
}

/**
 * One entry the `@`-menu can show: a file (insertable as a mention) or a directory (navigable — picking it drills the menu into that folder rather than inserting anything).
 */
export interface MentionCandidate extends WorkspaceFileRef {
  isDirectory: boolean;
}

export interface MentionQuery {
  /**
   * Whether an `@query` is active at the caret.
   */
  active: boolean;
  /**
   * The text typed after `@` up to the caret.
   */
  query: string;
  /**
   * Index of the `@` in the draft.
   */
  start: number;
  /**
   * Caret index (end of the query span).
   */
  end: number;
}







const MENTION_TOKEN_RE = /(^|\s)@(?:"([^"]*)|([\w./-]*))$/;

/**
 * Derives the active `@query` from the draft text up to the caret.
 */
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

/**
 * The token inserted into the draft for a mention — `@path`, or `@"path"` when the path contains whitespace so the reference stays one lexeme.
 */
export function mentionToken(file: WorkspaceFileRef): string {
  return needsQuoting(file.path) ? `@"${file.path}"` : `@${file.path}`;
}

/**
 * Splits an active `@query` into the directory being browsed and the leaf filter within it.
 */
export function splitMentionQuery(query: string): { dir: string; leaf: string } {
  const slash = query.lastIndexOf('/');
  if (slash === -1) return { dir: '', leaf: query };
  return { dir: query.slice(0, slash), leaf: query.slice(slash + 1) };
}

/**
 * The candidates shown for a browse scope: the directory's entries whose name starts-with, then contains, the leaf filter — directories first (they are navigation), files second, each group alphabetical.
 */
export function mentionCandidatesForScope(
  entries: MentionCandidate[],
  leaf: string,
): MentionCandidate[] {
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

/**
 * Drills the draft into a directory: replaces the active `@query` span with `@<dir>/` — quoted (`@"<dir>/`, open quote, no closing) when the directory path contains whitespace, so browsing continues inside a spaced path.
 */
export function applyMentionFolder(
  text: string,
  q: MentionQuery,
  dir: WorkspaceFileRef,
): { text: string; caret: number } {
  const token = browseToken(dir.path);
  const next = text.slice(0, q.start) + token + text.slice(q.end);
  return { text: next, caret: q.start + token.length };
}

/**
 * Ascends the browse one directory: rewrites the active `@query` to browse the PARENT of the directory currently in scope (dropping any leaf filter).
 */
export function applyMentionAscend(text: string, q: MentionQuery): { text: string; caret: number } {
  const token = browseToken(parentDir(queryScope(q.query)));
  const next = text.slice(0, q.start) + token + text.slice(q.end);
  return { text: next, caret: q.start + token.length };
}

/**
 * Keyboard actions for the `@`-mention FILE BROWSER.
 */
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

/**
 * The path that should be live-previewed while browsing the `@`-menu: the highlighted candidate's path when it is a FILE, otherwise `null` (directories are navigation, not content, so they get no preview).
 */
export function mentionPreviewPath(
  entries: MentionCandidate[],
  activeIndex: number,
): string | null {
  const entry = entries[activeIndex];
  if (!entry || entry.isDirectory) return null;
  return entry.path;
}

/**
 * Case-insensitive filter of the workspace file list by the query, matched against both the display name and the full path.
 */
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

/**
 * Replaces the active `@query` span with the chosen file's token followed by a space, returning the new draft and the caret position after the inserted token.
 */
export function applyMention(
  text: string,
  q: MentionQuery,
  file: WorkspaceFileRef,
): { text: string; caret: number } {
  const token = `${mentionToken(file)} `;
  const next = text.slice(0, q.start) + token + text.slice(q.end);
  return { text: next, caret: q.start + token.length };
}

/**
 * Returns the subset of `selected` mentions whose token still appears in the final draft (the user may have deleted a token after selecting it), de-duplicated by path.
 */
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

/**
 * Serializes a draft into ACP prompt content blocks: the text block (the draft as typed, tokens included), one `resource_link` block per mention, then one `image` block per pending image and one `audio` block per pending clip (base64 `data` + `mimeType`, exactly the libacp `ContentBlock` wire form — no `data:` URI prefix).
 */
export function promptBlocksFromDraft(
  text: string,
  mentions: WorkspaceFileRef[],
  images: PendingImageAttachment[] = [],
  audio: PendingAudioAttachment[] = [],
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
  for (const clip of audio) {
    blocks.push(audioContent(clip.data, clip.mimeType));
  }
  return blocks;
}
