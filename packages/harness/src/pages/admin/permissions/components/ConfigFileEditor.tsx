import { Button, Dialog, DialogFooter, InlineNotice } from '@contenox/ui';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveConfigDocument } from '../../../../hooks/usePermissions';
import { isConflict, type ConfigDocument, type ConfigScope } from '../../../../lib/agentsConfig';
import { DiscardChangesDialog } from '../../../chat/components/DiscardChangesDialog';

const MonacoView = lazy(() => import('../../../../components/editors/MonacoView'));

export function ConfigFileEditor({
  document,
  scope,
  onClose,
}: {
  document: ConfigDocument & { raw: string };
  scope: ConfigScope;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(document.raw);
  const [discard, setDiscard] = useState(false);
  const mutation = useSaveConfigDocument(scope);
  const dirty = text !== document.raw;
  const save = () => {
    setDiscard(false);
    if (dirty && !mutation.isPending)
      mutation.mutate({ revision: document.revision, raw: text }, { onSuccess: onClose });
  };
  const close = () => {
    if (!mutation.isPending) {
      if (dirty) setDiscard(true);
      else onClose();
    }
  };
  return (
    <>
      <Dialog
        open
        onClose={close}
        closeLabel={t('common.close')}
        title="agents.toml"
        className="w-[min(54rem,94vw)]">
        <p className="text-text-muted text-xs break-all">{document.path}</p>
        <Suspense fallback={<p>{t('workspace.loading')}</p>}>
          <MonacoView
            path={document.path}
            value={text}
            onChange={setText}
            onSave={save}
            className="h-[52vh] min-h-40"
            options={{ readOnly: mutation.isPending }}
          />
        </Suspense>
        {mutation.error && (
          <InlineNotice variant="error" role="alert">
            {isConflict(mutation.error) ? t('editor.conflict_save_title') : mutation.error.message}
          </InlineNotice>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            {t('common.close')}
          </Button>
          <Button onClick={save} disabled={!dirty || mutation.isPending}>
            {t('editor.save')}
          </Button>
        </DialogFooter>
      </Dialog>
      {discard && (
        <DiscardChangesDialog
          name="agents.toml"
          onSave={save}
          onCancel={() => setDiscard(false)}
          onDiscard={onClose}
        />
      )}
    </>
  );
}
