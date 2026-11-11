import { Button, Dialog, DialogFooter, P } from '@contenox/ui';
import { useTranslation } from 'react-i18next';

export interface DiscardChangesDialogProps {
  name: string | null;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function DiscardChangesDialog({
  name,
  onSave,
  onDiscard,
  onCancel,
}: DiscardChangesDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={name !== null}
      onClose={onCancel}
      title={t('editor.discard_title', { name: name ?? '' })}
      closeLabel={t('common.cancel')}
      className="w-[min(540px,calc(100vw-2rem))]">
      <P className="text-sm">{t('editor.discard_body')}</P>
      <DialogFooter className="mt-3 flex-wrap">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="button" variant="danger" onClick={onDiscard}>
          {t('editor.discard')}
        </Button>
        <Button type="button" onClick={onSave}>
          {t('editor.save_and_close')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
