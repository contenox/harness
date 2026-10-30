import { InlineNotice, Span } from '@contenox/ui';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceFilePeek } from '../../../hooks/useWorkspaceFiles';

const MonacoView = lazy(() => import('../../../components/editors/MonacoView'));

export interface FileViewTabProps {
  path: string;
  readFile: (path: string) => Promise<WorkspaceFilePeek>;
}

type ViewState = { status: 'loading' } | { status: 'loaded'; peek: WorkspaceFilePeek } | { status: 'error' };

export function FileViewTab({ path, readFile }: FileViewTabProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    void readFile(path)
      .then(peek => {
        if (!cancelled) setState({ status: 'loaded', peek });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [path, readFile]);

  if (state.status === 'loading') {
    return <Span variant="muted" className="block px-1 py-1 text-xs">{t('workspace.loading')}</Span>;
  }
  if (state.status === 'error') {
    return <InlineNotice variant="error">{t('workspace.peek_error')}</InlineNotice>;
  }
  if (state.peek.isBinary) {
    return <InlineNotice variant="info">{t('workspace.binary_file')}</InlineNotice>;
  }
  const lineCount = state.peek.text.split('\n').length;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Span variant="muted" className="block shrink-0 px-1 pb-1 text-[11px]">
        {lineCount} {lineCount === 1 ? t('workspace.line') : t('workspace.lines')}
      </Span>
      <Suspense
        fallback={
          <Span variant="muted" className="block px-1 py-1 text-xs">
            {t('workspace.loading')}
          </Span>
        }>
        <MonacoView path={path} value={state.peek.text} />
      </Suspense>
    </div>
  );
}
