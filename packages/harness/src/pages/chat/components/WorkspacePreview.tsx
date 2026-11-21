import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { previewFormat } from '../lib/previewFormat';

const MarkdownPreview = lazy(() => import('./MarkdownPreview'));
const DocumentPreview = lazy(() => import('./DocumentPreview'));
const DelimitedPreview = lazy(() =>
  import('./DocumentPreview').then(m => ({ default: m.DelimitedPreview })),
);
const PdfPreview = lazy(() => import('./PdfPreview'));
const MonacoView = lazy(() => import('../../../components/editors/MonacoView'));

type PreviewProps = { path: string; text?: string; base64?: string };
type MediaType = 'image' | 'audio' | 'video';

function MediaPreview({
  type,
  mime,
  bytes,
  path,
}: {
  type: MediaType;
  mime: string;
  bytes: Uint8Array<ArrayBuffer>;
  path: string;
}) {
  const { t } = useTranslation();
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [mime, bytes]);
  if (!src) return null;
  if (failed === src)
    return (
      <p role="alert" className="p-2 text-sm">
        {t('workspace.peek_error')}
      </p>
    );
  const onError = () => setFailed(src);
  if (type === 'audio')
    return (
      <audio controls src={src} className="m-2 max-w-full" aria-label={path} onError={onError} />
    );
  if (type === 'video')
    return (
      <video
        controls
        src={src}
        className="max-h-full max-w-full"
        aria-label={path}
        onError={onError}
      />
    );
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-2">
      <img
        alt={path}
        src={src}
        className="max-h-full max-w-full object-contain"
        onError={onError}
      />
    </div>
  );
}

function PreviewContent({ path, text = '', base64 }: PreviewProps) {
  const { t } = useTranslation();
  const format = previewFormat(path);
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const needsBytes = !!format && format.type !== 'markdown' && format.type !== 'table';
  const data = useMemo(() => {
    if (!needsBytes) return;
    try {
      return base64 === undefined
        ? new TextEncoder().encode(text)
        : Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    } catch {
      return;
    }
  }, [needsBytes, base64, text]);
  if (needsBytes && !data)
    return (
      <p role="alert" className="p-2 text-sm">
        {t('workspace.peek_error')}
      </p>
    );
  switch (format?.type) {
    case 'pdf':
      return data && <PdfPreview bytes={data} />;
    case 'office':
      return data && <DocumentPreview data={data} ext={ext} />;
    case 'audio':
    case 'video':
    case 'image':
      return (
        data &&
        format.mime && (
          <MediaPreview type={format.type} path={path} mime={format.mime} bytes={data} />
        )
      );
    case 'table':
      return <DelimitedPreview text={text} ext={ext} />;
    case 'markdown':
      return <MarkdownPreview text={text} />;
    default:
      return base64 === undefined ? (
        <MonacoView value={text} path={path} className="h-52 min-h-24 flex-1" />
      ) : (
        <p className="p-2 text-sm">{t('preview.unsupported', { ext })}</p>
      );
  }
}

export function WorkspacePreview(props: PreviewProps) {
  const { t } = useTranslation();
  return (
    <Suspense fallback={t('workspace.loading')}>
      <PreviewContent key={props.path} {...props} />
    </Suspense>
  );
}
