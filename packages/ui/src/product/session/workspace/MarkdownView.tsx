import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PreviewViewerProps } from './previewRegistry';

function decodeUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

export default function MarkdownView({ content, path }: PreviewViewerProps) {
  return (
    <div
      className="min-h-0 min-w-0 flex-1 overflow-y-auto"
      role="tabpanel"
      aria-label={`Preview ${path}`}>
      <div className="prose prose-compact dark:prose-invert max-w-none px-4 py-3 text-sm">
        <Markdown remarkPlugins={[remarkGfm]}>{decodeUtf8(content)}</Markdown>
      </div>
    </div>
  );
}
