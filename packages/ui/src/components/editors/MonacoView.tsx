import { Editor } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import './monacoBootstrap';
import { languageForPath } from './fileLanguage';
import { defineCanvasMonacoThemes, useCanvasMonacoTheme } from './monacoTheme';

/**
 * MonacoView renders an editable or read-only source document with local workers and themes.
 */
export default function MonacoView({
  value,
  path,
  readOnly = false,
  onChange,
  options,
}: {
  value: string;
  path: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  options?: editor.IStandaloneEditorConstructionOptions;
}) {
  const theme = useCanvasMonacoTheme();
  return (
    <Editor
      height="100%"
      value={value}
      path={path}
      language={languageForPath(path)}
      theme={theme}
      beforeMount={defineCanvasMonacoThemes}
      onChange={
        readOnly
          ? undefined
          : next => {
              if (next !== undefined) onChange?.(next);
            }
      }
      options={{
        automaticLayout: true,
        editContext: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontFamily: '"Geist Mono", ui-monospace, monospace',
        padding: { top: 8, bottom: 8 },
        wordWrap: 'on',
        ...options,
        readOnly,
      }}
    />
  );
}
