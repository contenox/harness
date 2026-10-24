import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownPreview({ value, label }: { value: string; label: string }) {
  return (
    <div
      aria-label={label}
      className="prose dark:prose-invert max-w-none overflow-auto p-4 text-sm">
      <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
    </div>
  );
}
