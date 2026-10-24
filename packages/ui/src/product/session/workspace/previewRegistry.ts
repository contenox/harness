import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { PreviewKind } from '../../../components/editors/previewKind';

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

export function previewViewer(kind: PreviewKind): PreviewViewer | null {
  return VIEWERS[kind] ?? null;
}

export function previewableKinds(): PreviewKind[] {
  return (Object.keys(VIEWERS) as PreviewKind[]).sort();
}
