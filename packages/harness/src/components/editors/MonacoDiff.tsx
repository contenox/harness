import '@contenox/ui/monaco';
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef } from 'react';
import { defineBeamMonacoThemes, useMonacoAppTheme } from '../../lib/monacoAppTheme';
import { MONACO_READONLY_OPTIONS } from './monacoOptions';

export interface MonacoDiffProps {
  original: string;
  modified: string;
  language?: string;
  options?: editor.IDiffEditorConstructionOptions;
}

export default function MonacoDiff({ original, modified, language, options }: MonacoDiffProps) {
  const theme = useMonacoAppTheme();
  const models = useRef<editor.IDiffEditorModel | null>(null);
  const handleMount = useCallback<DiffOnMount>(instance => {
    models.current = instance.getModel();
  }, []);
  useEffect(
    () => () => {
      const held = models.current;
      models.current = null;
      if (!held) return;
      setTimeout(() => {
        held.original.dispose();
        held.modified.dispose();
      }, 0);
    },
    [],
  );
  return (
    <DiffEditor
      height="100%"
      original={original}
      modified={modified}
      language={language}
      theme={theme}
      beforeMount={defineBeamMonacoThemes}
      onMount={handleMount}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      options={{ ...MONACO_READONLY_OPTIONS, ...options }}
    />
  );
}
