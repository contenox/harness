import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
GlobalWorkerOptions.workerSrc = worker;

export default function PdfPreview({ bytes }: { bytes: Uint8Array<ArrayBuffer> }) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    let active = true;
    setDoc(undefined);
    setPage(1);
    setError('');
    const task = getDocument({ data: bytes.slice(), useSystemFonts: true });
    void task.promise
      .then(pdf => {
        if (active) setDoc(pdf);
      })
      .catch(e => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [bytes]);
  useEffect(() => {
    const el = canvas.current;
    setRendered(false);
    if (!doc || !el) return;
    let active = true;
    let cancel: (() => void) | undefined;
    void doc
      .getPage(page)
      .then(p => {
        if (!active) return;
        const base = p.getViewport({ scale: 1 });
        const viewport = p.getViewport({
          scale: Math.min(1.5, 1500 / Math.max(base.width, base.height)),
        });
        el.width = viewport.width;
        el.height = viewport.height;
        const job = p.render({ canvas: el, viewport });
        cancel = () => job.cancel();
        return job.promise.then(() => {
          if (active) setRendered(true);
        });
      })
      .catch(e => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
      cancel?.();
    };
  }, [doc, page]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
      {error && <p role="alert">{error}</p>}
      {doc && (
        <div className="flex items-center justify-center gap-3 text-xs">
          <button
            disabled={page === 1}
            onClick={() => setPage(n => n - 1)}
            aria-label={t('preview.previous')}>
            ‹
          </button>
          <span>
            {page} / {doc.numPages}
          </span>
          <button
            disabled={page === doc.numPages}
            onClick={() => setPage(n => n + 1)}
            aria-label={t('preview.next')}>
            ›
          </button>
        </div>
      )}
      <canvas
        ref={canvas}
        aria-label="PDF"
        aria-busy={!rendered}
        className="mx-auto h-auto max-w-full self-start bg-white shadow"
      />
    </div>
  );
}
