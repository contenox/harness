import { Editor } from '@monaco-editor/react';

import '../../../components/editors/monacoBootstrap';
import { languageForPath } from '../../../components/editors/fileLanguage';
import { defineCanvasMonacoThemes, useCanvasMonacoTheme } from '../../../components/editors/monacoTheme';
import type { MonacoViewProps } from './monacoViewShared';
import { MONACO_READONLY_OPTIONS } from './monacoViewShared';

/**
 * The read-only Monaco file viewer of the session canvas.
 */
export default function MonacoView({
  value,
  path,
  className,
  options,
  onAskSelection,
  readOnly = true,
  onChange,
}: MonacoViewProps) {
  const theme = useCanvasMonacoTheme();
  return (
    <div className={className ?? 'min-h-0 flex-1 overflow-hidden'}>
      <Editor
        height="100%"
        value={value}
        language={languageForPath(path)}
        path={path}
        theme={theme}
        beforeMount={defineCanvasMonacoThemes}
        onMount={ed => {
          if (!onAskSelection) return;
          ed.addAction({
            id: `canvas.askSelection.${ed.getId()}`,
            label: 'Ask about selection',
            contextMenuGroupId: '9_cutcopypaste',
            contextMenuOrder: 1.5,
            run: target => {
              const sel = target.getSelection();
              if (!sel || sel.isEmpty() || target.getModel() == null) return;
              const text = target.getModel()!.getValueInRange(sel);
              if (text.trim() === '') return;
              onAskSelection({
                startLine: sel.startLineNumber,
                endLine: sel.endLineNumber,
                text,
              });
            },
          });
        }}
        onChange={readOnly ? undefined : (v?: string) => v !== undefined && onChange?.(v)}
        options={
          readOnly
            ? options
              ? { ...MONACO_READONLY_OPTIONS, ...options }
              : MONACO_READONLY_OPTIONS
            : (options ?? {})
        }
      />
    </div>
  );
}
