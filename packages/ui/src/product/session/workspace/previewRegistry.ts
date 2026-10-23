import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { PreviewKind } from '../../../components/editors/previewKind';

/**
 * The read-only preview contract every rendered viewer implements.
 */
export interface PreviewViewerProps {
  content: string;
  path: string;
  name: string;
}

export type PreviewViewer = LazyExoticComponent<ComponentType<PreviewViewerProps>>;

const VIEWERS: Partial<Record<PreviewKind, PreviewViewer>> = {
  markdown: lazy(() => import('./MarkdownView')),
  image: lazy(() => import('./ImageView')),
  pdf: lazy(() => import('./PdfView')),
};

/**
 * The lazy viewer for a kind, or null when the kind renders outside the pipe (code/unsupported).
 */
export function previewViewer(kind: PreviewKind): PreviewViewer | null {
  return VIEWERS[kind] ?? null;
}

/**
 * Every kind with a registered read-only viewer, sorted for stable tests.
 */
export function previewableKinds(): PreviewKind[] {
  return (Object.keys(VIEWERS) as PreviewKind[]).sort();
}
