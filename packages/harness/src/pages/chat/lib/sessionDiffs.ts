import type { AcpToolCallState } from '../../../hooks/acpSessionState';

export interface SessionFileDiff {
  path: string;
  /** Text before the session's first change to this file ('' when the file was created). */
  oldText: string;
  /** Text after the session's last change to this file. */
  newText: string;
  /** Number of tool-call diffs folded into this entry. */
  changes: number;
}

interface TimelineLike {
  kind: string;
  id: string;
}

export interface SessionDiffSource {
  items: readonly TimelineLike[];
  toolCalls: Readonly<Record<string, AcpToolCallState>>;
}

/**
 * Files changed in a session, aggregated from the diff content of its tool calls: one entry per
 * path, old text of the first change to new text of the last. Failed tool calls are ignored and
 * files whose net change is empty (edited then reverted) are dropped. Order is first-touched.
 */
export function aggregateSessionDiffs(session: SessionDiffSource): SessionFileDiff[] {
  const byPath = new Map<string, SessionFileDiff>();
  for (const item of session.items) {
    if (item.kind !== 'tool_call') continue;
    const call = session.toolCalls[item.id];
    if (!call || call.status === 'failed') continue;
    for (const c of call.content ?? []) {
      if (c.type !== 'diff' || !c.path) continue;
      const existing = byPath.get(c.path);
      if (existing) {
        existing.newText = c.newText ?? '';
        existing.changes += 1;
      } else {
        byPath.set(c.path, {
          path: c.path,
          oldText: c.oldText ?? '',
          newText: c.newText ?? '',
          changes: 1,
        });
      }
    }
  }
  return [...byPath.values()].filter(d => d.oldText !== d.newText);
}
