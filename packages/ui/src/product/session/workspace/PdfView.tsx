import type { PreviewViewerProps } from './previewRegistry';

export default function PdfView({ content, name }: PreviewViewerProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <embed
        type="application/pdf"
        src={`data:application/pdf;base64,${content}`}
        title={name}
        className="min-h-0 min-w-0 flex-1"
      />
    </div>
  );
}
