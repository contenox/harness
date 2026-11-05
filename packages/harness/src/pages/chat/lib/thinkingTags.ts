const OPEN_TAG = /^\s*<thinking>/i;
const CLOSE_TAG = /<\/thinking>/i;

export interface SplitThinking {
  thinking: string | null;
  answer: string;
}

export function splitLeadingThinking(text: string): SplitThinking {
  const open = OPEN_TAG.exec(text);
  if (!open) return { thinking: null, answer: text };
  const body = text.slice(open[0].length);
  const close = CLOSE_TAG.exec(body);
  if (!close) return { thinking: body.trim(), answer: '' };
  return {
    thinking: body.slice(0, close.index).trim(),
    answer: body.slice(close.index + close[0].length).replace(/^\s+/, ''),
  };
}
