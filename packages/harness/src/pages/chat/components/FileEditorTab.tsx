import { Button, InlineNotice, Span } from '@contenox/ui';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EditorApi } from '../../../hooks/useEditorBuffers';
import { isDirty } from '../../../lib/editorBuffers';

const MonacoView = lazy(() => import('../../../components/editors/MonacoView'));
const MonacoCompare = lazy(() => import('../../../components/editors/MonacoCompare'));

export interface FileEditorTabProps {
  path: string;
  editor: EditorApi;
}

function Loading() {
  const { t } = useTranslation();
  return (
    <Span variant="muted" className="block px-1 py-1 text-xs">
      {t('workspace.loading')}
    </Span>
  );
}

export function FileEditorTab({ path, editor }: FileEditorTabProps) {
  const { t } = useTranslation();
  const [comparing, setComparing] = useState(false);
  const buffer = editor.buffers[path];

  if (!buffer || buffer.status === 'loading') return <Loading />;
  if (buffer.status === 'error') {
    return <InlineNotice variant="error">{t('workspace.peek_error')}</InlineNotice>;
  }
  if (buffer.status === 'binary') {
    return <InlineNotice variant="info">{t('workspace.binary_file')}</InlineNotice>;
  }

  const dirty = isDirty(buffer);
  const conflict = buffer.conflict;
  const lineCount = buffer.text.split('\n').length;
  const showCompare = comparing && conflict !== null && conflict.diskText !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <div className="flex shrink-0 items-center gap-2 px-1">
        <Span variant="muted" className="text-[11px]">
          {lineCount} {lineCount === 1 ? t('workspace.line') : t('workspace.lines')}
        </Span>
        <Span variant="muted" className="text-[11px]">
          {buffer.saving ? t('editor.saving') : dirty ? t('editor.unsaved') : t('editor.saved')}
        </Span>
        <div className="ml-auto">
          <Button
            type="button"
            size="xs"
            variant={dirty ? 'primary' : 'ghost'}
            disabled={!dirty || buffer.saving || conflict !== null}
            onClick={() => void editor.save(path)}>
            {t('editor.save')}
          </Button>
        </div>
      </div>
      {buffer.saveError && (
        <InlineNotice variant="error" title={t('editor.save_failed')}>
          {buffer.saveError}
        </InlineNotice>
      )}
      {conflict && (
        <InlineNotice
          variant="warning"
          title={
            conflict.deleted
              ? t('editor.conflict_deleted_title')
              : conflict.reason === 'save'
                ? t('editor.conflict_save_title')
                : t('editor.conflict_disk_title')
          }>
          <span className="block">
            {conflict.deleted ? t('editor.conflict_deleted_body') : t('editor.conflict_body')}
          </span>
          <span className="mt-2 flex flex-wrap gap-2">
            {!conflict.deleted && (
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => {
                  setComparing(false);
                  void editor.reload(path);
                }}>
                {t('editor.take_disk')}
              </Button>
            )}
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => {
                setComparing(false);
                void editor.overwrite(path);
              }}>
              {conflict.deleted ? t('editor.recreate') : t('editor.keep_mine')}
            </Button>
            {conflict.diskText !== null && (
              <Button type="button" size="xs" variant="ghost" onClick={() => setComparing(c => !c)}>
                {showCompare ? t('editor.hide_compare') : t('editor.compare')}
              </Button>
            )}
          </span>
        </InlineNotice>
      )}
      <Suspense fallback={<Loading />}>
        {showCompare ? (
          <MonacoCompare path={path} original={conflict.diskText ?? ''} modified={buffer.text} />
        ) : (
          <MonacoView
            path={path}
            value={buffer.text}
            scrollResetKey={buffer.reloads}
            options={{ readOnly: false }}
            onChange={text => editor.edit(path, text)}
            onSave={() => void editor.save(path)}
          />
        )}
      </Suspense>
    </div>
  );
}
