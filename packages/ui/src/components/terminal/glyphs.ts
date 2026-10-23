
export const TERMINAL_GLYPH = {

  prompt: "❯",

  tool: "⏺",

  cont: "⎿",

  approval: "⏸",

  running: "▍",
} as const;

export type TerminalGlyph = (typeof TERMINAL_GLYPH)[keyof typeof TERMINAL_GLYPH];
