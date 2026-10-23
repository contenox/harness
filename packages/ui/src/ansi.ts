


const OSC_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;


const CSI_NON_SGR_RE = /\x1b\[[0-9;?]*[@-ln-~]/g;


const ESC_SINGLE_RE = /\x1b[@-Zut\\-_=><]/g;



// eslint-disable-next-line no-control-regex
const STRAY_CONTROL_RE = /[\x00-\x08\x0b-\x1a\x1c-\x1f\x7f]/g;

/**
 * Strips non-SGR terminal control sequences, leaving printable text and SGR color codes (`ESC[…m`) intact.
 */
export function sanitizeTerminalText(text: string): string {
  if (text.indexOf("\x1b") === -1 && !/[\x00-\x08\x0b-\x1f\x7f]/.test(text)) {
    return text;
  }
  return text
    .replace(OSC_RE, "")
    .replace(CSI_NON_SGR_RE, "")
    .replace(ESC_SINGLE_RE, "")
    .replace(STRAY_CONTROL_RE, "");
}

/**
 * Full strip including SGR — plain text with no escapes at all.
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return sanitizeTerminalText(text).replace(/\x1b\[[0-9;]*m/g, "");
}
