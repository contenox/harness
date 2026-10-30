import { Editor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { defineBeamMonacoThemes, useMonacoAppTheme } from '../../lib/monacoAppTheme';
import { languageForPath } from '../../lib/missionChanges';


export const MONACO_READONLY_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  renderWhitespace: 'selection',
  padding: { top: 8, bottom: 8 },
};

export interface MonacoViewProps {
  value: string;
  language?: string;
  path?: string;
  className?: string;
  options?: editor.IStandaloneEditorConstructionOptions;
  /** When set, the editor is writable and reports every change. */
  onChange?: (value: string) => void;
}

export default function MonacoView({ value, language, path, className, options, onChange }: MonacoViewProps) {
  const theme = useMonacoAppTheme();
  const resolvedLanguage = language ?? (path ? languageForPath(path) : undefined);
  return (
    <div className={className ?? 'min-h-0 flex-1 overflow-hidden'}>
      <Editor
        height="100%"
        value={value}
        language={resolvedLanguage}
        theme={theme}
        beforeMount={defineBeamMonacoThemes}
        onChange={onChange ? next => onChange(next ?? '') : undefined}
        options={options ? { ...MONACO_READONLY_OPTIONS, ...options } : MONACO_READONLY_OPTIONS}
      />
    </div>
  );
}
