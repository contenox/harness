import { Button, Dialog, DialogFooter, FormField, InlineNotice, Input, P } from '@contenox/ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validName } from '../../../lib/workspaceFileOps';

export interface PathNameDialogProps {
  open: boolean;
  title: string;
  label: string;
  hint?: string;
  initial: string;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export function PathNameDialog(props: PathNameDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      closeLabel={t('common.close')}
      className="w-[26rem] max-w-[92vw]">
      {props.open && <PathNameForm key={props.initial} {...props} />}
    </Dialog>
  );
}

function PathNameForm({
  label,
  hint,
  initial,
  submitLabel,
  busy,
  error,
  onSubmit,
  onClose,
}: PathNameDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const ok = validName(value) && value.trim() !== initial;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const dot = el.value.lastIndexOf('.');
      const slash = el.value.lastIndexOf('/');
      el.setSelectionRange(slash + 1, dot > slash + 1 ? dot : el.value.length);
    }, 0);
    return () => clearTimeout(id);
  }, []);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        if (ok && !busy) onSubmit(value.trim());
      }}>
      <FormField label={label} description={hint}>
        <Input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} />
      </FormField>
      {error && (
        <InlineNotice variant="error" role="alert">
          {error}
        </InlineNotice>
      )}
      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!ok} isLoading={busy}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export interface DeleteEntryDialogProps {
  path: string | null;
  isDirectory: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteEntryDialog({
  path,
  isDirectory,
  busy,
  error,
  onConfirm,
  onClose,
}: DeleteEntryDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={path !== null}
      onClose={onClose}
      title={t(isDirectory ? 'tree.delete_folder_title' : 'tree.delete_file_title', {
        name: path ?? '',
      })}
      closeLabel={t('common.close')}
      className="w-[26rem] max-w-[92vw]">
      <P className="text-sm">
        {t(isDirectory ? 'tree.delete_folder_body' : 'tree.delete_file_body')}
      </P>
      {error && (
        <InlineNotice variant="error" role="alert" className="mt-3">
          {error}
        </InlineNotice>
      )}
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="button" variant="danger" isLoading={busy} onClick={onConfirm}>
          {t('tree.delete')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
