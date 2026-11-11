import type { editor } from 'monaco-editor';

export const MONACO_READONLY_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  renderWhitespace: 'selection',
  padding: { top: 8, bottom: 8 },
};
