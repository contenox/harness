import '@contenox/ui/monaco';
import { Editor, type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { languageForPath } from '../../lib/missionChanges';
import { defineBeamMonacoThemes, useMonacoAppTheme } from '../../lib/monacoAppTheme';
import { SelectionQuote } from '../../lib/selectionQuote';
import { MONACO_READONLY_OPTIONS } from './monacoOptions';

export interface MonacoViewProps {
  value: string;
  language?: string;
  path?: string;
  className?: string;
  options?: editor.IStandaloneEditorConstructionOptions;
  /** When set, the editor is writable and reports every change. */
  onChange?: (value: string) => void;
  onSave?: () => void;
  scrollResetKey?: number;
}

export default function MonacoView({
  value,
  language,
  path,
  className,
  options,
  onChange,
  onSave,
  scrollResetKey,
}: MonacoViewProps) {
  const theme = useMonacoAppTheme();
  const { t } = useTranslation();
  const quote = useContext(SelectionQuote);
  const quoteRef = useRef({ path, quote, label: t('preview.ask') });
  quoteRef.current = { path, quote, label: t('preview.ask') };
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const instanceRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const handleMount = useCallback<OnMount>((instance, monaco) => {
    instanceRef.current = instance;
    if (quoteRef.current.quote && quoteRef.current.path)
      instance.addAction({
        id: 'contenox.askSelection',
        label: quoteRef.current.label,
        precondition: 'editorHasSelection',
        contextMenuGroupId: '9_cutcopypaste',
        contextMenuOrder: 1.5,
        run: editor => {
          const selection = editor.getSelection();
          const model = editor.getModel();
          const { path, quote } = quoteRef.current;
          if (selection && model && path && !selection.isEmpty())
            quote?.(
              path,
              selection.startLineNumber,
              selection.endLineNumber,
              model.getValueInRange(selection),
            );
        },
      });
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current?.());
  }, []);
  useEffect(() => {
    if (scrollResetKey) instanceRef.current?.setScrollLeft(0);
  }, [scrollResetKey]);
  const resolvedLanguage = language ?? (path ? languageForPath(path) : undefined);
  return (
    <div className={className ?? 'min-h-0 flex-1 overflow-hidden'}>
      <Editor
        height="100%"
        value={value}
        language={resolvedLanguage}
        theme={theme}
        beforeMount={defineBeamMonacoThemes}
        onMount={handleMount}
        onChange={onChange ? next => onChange(next ?? '') : undefined}
        options={options ? { ...MONACO_READONLY_OPTIONS, ...options } : MONACO_READONLY_OPTIONS}
      />
    </div>
  );
}
