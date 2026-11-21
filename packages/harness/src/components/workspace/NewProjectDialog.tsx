import { Button, Dialog, DialogFooter, FormField, InlineNotice, Input } from '@contenox/ui';
import { FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectActions } from '../../hooks/useProjectActions';
import { ApiError } from '../../lib/fetch';
import type { WorkspaceRoot } from '../../lib/types';
import { projectName } from '../../lib/workspaceRoots';
import { folderBasename } from './folderTree';

export interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  closeSidebar?: () => void;
  agent?: string | null;
  existingRoots?: WorkspaceRoot[];
  onSelectRoot?: (path: string) => void;
}

export function NewProjectDialog({
  open,
  onClose,
  closeSidebar,
  agent,
  existingRoots,
  onSelectRoot,
}: NewProjectDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('projects.dialog_title')}
      closeLabel={t('common.close')}
      className="w-[30rem] max-w-[92vw]">
      {existingRoots?.length && onSelectRoot ? (
        <div className="mb-3 flex flex-wrap gap-1">
          {existingRoots.map(root => (
            <Button key={root.path} variant="outline" onClick={() => onSelectRoot(root.path)}>
              {projectName(root)}
            </Button>
          ))}
        </div>
      ) : null}
      <NewProjectForm onClose={onClose} closeSidebar={closeSidebar} agent={agent} />
    </Dialog>
  );
}

function NewProjectForm({
  onClose,
  closeSidebar,
  agent,
}: {
  onClose: () => void;
  closeSidebar?: () => void;
  agent?: string | null;
}) {
  const { t } = useTranslation();
  const { createProject, creating } = useProjectActions(closeSidebar);
  const picker = typeof window !== 'undefined' ? window.contenoxDesktop : undefined;

  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmedPath = path.trim();
  const canSubmit = trimmedPath !== '' && !creating;

  const chooseFolder = async () => {
    if (!picker) return;
    const selected = await picker.selectDirectory();
    if (!selected) return;
    setPath(selected);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await createProject(trimmedPath, name.trim() || folderBasename(trimmedPath), agent);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('projects.create_error_fallback'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label={t('projects.name_label')}>
        <Input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={folderBasename(trimmedPath) || t('projects.name_placeholder')}
        />
      </FormField>

      <FormField label={t('projects.source_label')} required={!picker}>
        {picker ? (
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={trimmedPath}
              title={trimmedPath}
              placeholder={t('projects.source_none')}
              className="min-w-0 flex-1 font-mono text-xs"
            />
            <Button type="button" variant="outline" onClick={chooseFolder}>
              <FolderPlus className="size-4" aria-hidden />
              {trimmedPath ? t('projects.source_change') : t('projects.source_add')}
            </Button>
          </div>
        ) : (
          <Input
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder={t('projects.path_placeholder')}
            required
          />
        )}
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
        <Button type="submit" disabled={!canSubmit} isLoading={creating}>
          {creating ? t('projects.create_submitting') : t('projects.create_submit')}
        </Button>
      </DialogFooter>
    </form>
  );
}
