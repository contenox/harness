import type { PreviewViewerProps } from './previewRegistry';

function imageMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'ico':
      return 'image/x-icon';
    case 'avif':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
}

export default function ImageView({ content, name, path }: PreviewViewerProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto">
      <img
        src={`data:${imageMime(path)};base64,${content}`}
        alt={name}
        className="max-h-full max-w-full object-contain px-4 py-3"
      />
    </div>
  );
}
