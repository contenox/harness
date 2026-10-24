import { useMemo } from 'react';
import type { editor } from 'monaco-editor';
import { useTheme } from './ThemeProvider';

export const BEAM_MONACO_THEME_LIGHT = 'beam-light';
export const BEAM_MONACO_THEME_DARK = 'beam-dark';

const beamLight: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#f8f9fa',
    'editor.foreground': '#2b2f33',
    'editorLineNumber.foreground': '#6c757d',
    'editorLineNumber.activeForeground': '#2b2f33',
    'editorCursor.foreground': '#2b2f33',
    'editor.selectionBackground': '#52525233',
    'editor.inactiveSelectionBackground': '#52525226',
    'editor.lineHighlightBackground': '#e9ecef',
    'editorLineNumber.background': '#f8f9fa',
    'editorIndentGuide.background': '#dee2e6',
    'editorIndentGuide.activeBackground': '#adb5bd',
    'editorWhitespace.foreground': '#ced4da',
    'scrollbarSlider.background': '#adb5bd80',
    'scrollbarSlider.hoverBackground': '#6c757d99',
    'scrollbarSlider.activeBackground': '#495057b3',
    'editorWidget.background': '#ffffff',
    'editorWidget.border': '#dee2e6',
    'editorSuggestWidget.background': '#ffffff',
    'editorSuggestWidget.border': '#dee2e6',
    'peekViewTitle.background': '#f1f3f5',
    'peekViewEditor.background': '#f8f9fa',
    'minimap.background': '#f8f9fa',
  },
};

const beamDark: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#0d0e10',
    'editor.foreground': '#e8eaed',
    'editorLineNumber.foreground': '#5f636b',
    'editorLineNumber.activeForeground': '#e8eaed',
    'editorCursor.foreground': '#e8eaed',
    'editor.selectionBackground': '#ededed33',
    'editor.inactiveSelectionBackground': '#ededed26',
    'editor.lineHighlightBackground': '#1a1c1f80',
    'editorLineNumber.background': '#0d0e10',
    'editorIndentGuide.background': '#24262a',
    'editorIndentGuide.activeBackground': '#4b4f56',
    'editorWhitespace.foreground': '#3b3e44',
    'scrollbarSlider.background': '#3b3e4480',
    'scrollbarSlider.hoverBackground': '#5f636b99',
    'scrollbarSlider.activeBackground': '#757980b3',
    'editorWidget.background': '#1a1c1f',
    'editorWidget.border': '#24262a',
    'editorSuggestWidget.background': '#1a1c1f',
    'editorSuggestWidget.border': '#24262a',
    'peekViewTitle.background': '#1a1c1f',
    'peekViewEditor.background': '#0d0e10',
    'minimap.background': '#0d0e10',
  },
};

type MonacoNS = typeof import('monaco-editor');

export function defineBeamMonacoThemes(monaco: MonacoNS): void {
  monaco.editor.defineTheme(BEAM_MONACO_THEME_LIGHT, beamLight);
  monaco.editor.defineTheme(BEAM_MONACO_THEME_DARK, beamDark);
}

export function useMonacoAppTheme(): typeof BEAM_MONACO_THEME_LIGHT | typeof BEAM_MONACO_THEME_DARK {
  const { theme } = useTheme();
  return useMemo(
    () => (theme === 'dark' ? BEAM_MONACO_THEME_DARK : BEAM_MONACO_THEME_LIGHT),
    [theme],
  );
}
