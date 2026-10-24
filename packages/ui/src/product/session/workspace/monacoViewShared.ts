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

export interface SelectedRegion {
  startLine: number;
  endLine: number;
  text: string;
}

export interface MonacoViewProps {
  value: string;
  path: string;
  className?: string;
  options?: editor.IStandaloneEditorConstructionOptions;
  onAskSelection?: (region: SelectedRegion) => void;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}
