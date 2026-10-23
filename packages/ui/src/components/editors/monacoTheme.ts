import { useSyncExternalStore } from 'react';
import type { editor } from 'monaco-editor';

export const CANVAS_MONACO_THEME_LIGHT = 'canvas-light';
export const CANVAS_MONACO_THEME_DARK = 'canvas-dark';

const canvasLight: editor.IStandaloneThemeData = {
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

const canvasDark: editor.IStandaloneThemeData = {
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

export function defineCanvasMonacoThemes(monaco: typeof import('monaco-editor')): void {
  monaco.editor.defineTheme(CANVAS_MONACO_THEME_LIGHT, canvasLight);
  monaco.editor.defineTheme(CANVAS_MONACO_THEME_DARK, canvasDark);
}

function subscribeScheme(cb: () => void): () => void {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => mo.disconnect();
}

export function canvasMonacoTheme():
  typeof CANVAS_MONACO_THEME_LIGHT | typeof CANVAS_MONACO_THEME_DARK {
  return document.documentElement.classList.contains('dark')
    ? CANVAS_MONACO_THEME_DARK
    : CANVAS_MONACO_THEME_LIGHT;
}

export function useCanvasMonacoTheme(): string {
  return useSyncExternalStore(subscribeScheme, canvasMonacoTheme, canvasMonacoTheme);
}
