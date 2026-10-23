import { Page } from '@contenox/ui';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * LegalPage renders one public legal document supplied by the application.
 */
export function LegalPage({ markdown }: { markdown: string }) {
  return (
    <Page>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="prose prose-sm dark:prose-invert mx-auto w-full max-w-2xl px-4 py-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      </div>
    </Page>
  );
}
