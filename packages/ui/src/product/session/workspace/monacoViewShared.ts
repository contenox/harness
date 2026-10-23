import type { editor } from 'monaco-editor';


export const MONACO_READONLY_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  renderWhitespace: 'selection',
  padding: { top: 8, bottom: 8 },
};

/**
 * A region a user selected in the viewer (1-based, inclusive lines) plus its text.
 */
export interface SelectedRegion {
  startLine: number;
  endLine: number;
  text: string;
}

export interface MonacoViewProps {
  /**
   * The text to render.
   */
  value: string;
  /**
   * Source path — the language is derived from it.
   */
  path: string;
  /**
   * Wrapper classes; the parent owns sizing, the editor fills it.
   */
  className?: string;
  /**
   * Option overrides merged onto {@link MONACO_READONLY_OPTIONS}.
   */
  options?: editor.IStandaloneEditorConstructionOptions;
  /**
   * Adds an "Ask about selection" context-menu action reporting the region.
   */
  onAskSelection?: (region: SelectedRegion) => void;
  /**
   * When false the editor is writable and reports edits through onChange.
   */
  readOnly?: boolean;
  /**
   * Fires on each edit while writable.
   */
  onChange?: (value: string) => void;
}
