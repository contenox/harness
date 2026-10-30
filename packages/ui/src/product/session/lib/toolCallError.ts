import type { AcpToolCallState } from '../state/acpSessionState';

export type ToolCallErrorSource = Pick<AcpToolCallState, 'status' | 'content' | 'meta' | 'rawOutput'>;

/**
 * The text to show for a tool call that failed.
 *
 * Only a call whose status is `failed` has an error. ACP agents return normal
 * tool output as text content too, so a text block on a pending, running or
 * completed call is output, not an error.
 *
 * For a failed call the order keeps the rendering generic: a standard ACP text
 * content block works with any agent, `_meta.error` is an optional annotation,
 * and raw output is the last resort for a call that merely reports failure.
 */
export function toolCallError(toolCall: ToolCallErrorSource): string | null {
  if (toolCall.status !== 'failed') return null;

  for (const block of toolCall.content ?? []) {
    if (block.type !== 'content') continue;
    const text = block.content?.type === 'text' ? block.content.text : undefined;
    if (typeof text === 'string' && text.trim() !== '') return text;
  }

  const metaError = toolCall.meta?.error;
  if (typeof metaError === 'string' && metaError.trim() !== '') return metaError;

  const output = toolCall.rawOutput;
  if (typeof output === 'string' && output.trim() !== '') return output;
  if (output != null) {
    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return String(output);
    }
  }

  return null;
}
