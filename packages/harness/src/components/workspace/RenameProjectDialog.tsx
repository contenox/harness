import { Button, Dialog, DialogFooter, FormField, InlineNotice, Input } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddWorkspaceRoot } from '../../hooks/useWorkspaceRootMutations';
import { ApiError } from '../../lib/fetch';
import type { WorkspaceRoot } from '../../lib/types';
import { projectName } from '../../lib/workspaceRoots';

export interface RenameProjectDialogProps {
  root: WorkspaceRoot | null;
  onClose: () => void;
}

export function RenameProjectDialog({ root, onClose }: RenameProjectDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={root !== null}
      onClose={onClose}
      title={t('projects.rename_title')}
      closeLabel={t('common.close')}
      className="w-[26rem] max-w-[92vw]">
      {root && <RenameForm key={root.path} root={root} onClose={onClose} />}
    </Dialog>
  );
}

function RenameForm({ root, onClose }: { root: WorkspaceRoot; onClose: () => void }) {
  const { t } = useTranslation();
  const rename = useAddWorkspaceRoot();
  const [name, setName] = useState(projectName(root));
  const next = name.trim();

  // The runtime stores a project's name next to its grant: re-adding the same path renames it.
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next === '' || rename.isPending) return;
    rename.mutate({ path: root.path, name: next }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField label={t('projects.name_label')}>
        <Input autoFocus value={name} onChange={e => setName(e.target.value)} />
      </FormField>
      {rename.error && (
        <InlineNotice variant="error" role="alert">
          {rename.error instanceof ApiError
            ? rename.error.message
            : t('projects.rename_error_fallback')}
        </InlineNotice>
      )}
      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={next === ''} isLoading={rename.isPending}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
