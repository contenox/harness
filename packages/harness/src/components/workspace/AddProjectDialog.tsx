import {
  Button,
  Dialog,
  FileTree,
  FormField,
  InlineNotice,
  Input,
  Select,
  Spinner,
  type FileTreeNode,
} from '@contenox/ui';
import { FolderSearch, Keyboard } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceFiles } from '../../hooks/useWorkspaceFiles';
import { useAddWorkspaceRoot } from '../../hooks/useWorkspaceRootMutations';
import { ApiError } from '../../lib/fetch';
import type { WorkspaceRoot } from '../../lib/types';
import { activeWorkspaceRoot, projectName, shortenRootPath } from '../../lib/workspaceRoots';
import { folderBasename, joinRootRelative, toFolderNodes } from './folderTree';

export interface AddProjectDialogProps {
  open: boolean;
  onClose: () => void;
  roots: readonly WorkspaceRoot[];
  onAdded?: () => void;
}

export function AddProjectDialog({ open, onClose, roots, onAdded }: AddProjectDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('projects.dialog_title')}
      closeLabel={t('common.close')}
      className="w-[34rem] max-w-[92vw]">
      <AddProjectBody roots={roots} onClose={onClose} onAdded={onAdded} />
    </Dialog>
  );
}

function AddProjectBody({
  roots,
  onClose,
  onAdded,
}: {
  roots: readonly WorkspaceRoot[];
  onClose: () => void;
  onAdded?: () => void;
}) {
  const { t } = useTranslation();
  const hasRoots = roots.length > 0;

  const [mode, setMode] = useState<'browse' | 'manual'>(hasRoots ? 'browse' : 'manual');
  const [browseRoot, setBrowseRoot] = useState(() => activeWorkspaceRoot(roots)?.path ?? '');
  const [selectedRel, setSelectedRel] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState('');
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);

  const addMutation = useAddWorkspaceRoot();

  const files = useWorkspaceFiles(mode === 'browse' ? browseRoot : null);
  const nodes = useMemo(() => toFolderNodes(files.cache), [files.cache]);

  const selectedAbsolute =
    mode === 'manual'
      ? manualPath.trim()
      : selectedRel
        ? joinRootRelative(browseRoot, selectedRel)
        : '';

  const nativePicker = typeof window !== 'undefined' ? window.contenoxDesktop : undefined;

  const chooseNativeFolder = async () => {
    if (!nativePicker) return;
    const selected = await nativePicker.selectDirectory();
    if (!selected) return;
    setMode('manual');
    setManualPath(selected);
    setName(folderBasename(selected));
    setNameEdited(false);
    addMutation.reset();
  };

  useEffect(() => {
    if (nameEdited) return;
    setName(selectedAbsolute ? folderBasename(selectedAbsolute) : '');
  }, [selectedAbsolute, nameEdited]);

  const handleNodeSelect = useCallback(
    (node: FileTreeNode) => {
      const path = node.path ?? node.id;
      files.ensureLoaded(path);
      setSelectedRel(path);
    },
    [files],
  );

  const handleRootChange = (next: string) => {
    setBrowseRoot(next);
    setSelectedRel(null);
  };

  const switchMode = (next: 'browse' | 'manual') => {
    setMode(next);
    setSelectedRel(null);
    setManualPath('');
    setNameEdited(false);
    addMutation.reset();
  };

  const normalizedSelected = selectedAbsolute.replace(/\/+$/, '');
  const existingRoot = normalizedSelected
    ? roots.find(r => r.path.replace(/\/+$/, '') === normalizedSelected)
    : undefined;

  const canSubmit = selectedAbsolute !== '' && !addMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    addMutation.mutate(
      { path: selectedAbsolute, name: name.trim() },
      {
        onSuccess: () => {
          onAdded?.();
          onClose();
        },
      },
    );
  };

  const addErrorMessage = addMutation.error
    ? addMutation.error instanceof ApiError
      ? addMutation.error.message
      : t('projects.add_error_fallback')
    : null;

  const rootOptions = roots.map(r => ({
    value: r.path,
    label: `${projectName(r)} (${shortenRootPath(r.path)})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode === 'browse' ? (
        <>
          <p className="text-text-muted dark:text-dark-text-muted text-sm">
            {t('projects.browse_hint')}
          </p>

          {roots.length > 1 && (
            <FormField label={t('projects.browse_start_label')}>
              <Select
                className="w-full"
                value={browseRoot}
                onChange={e => handleRootChange(e.target.value)}
                options={rootOptions}
              />
            </FormField>
          )}

          {nativePicker && (
            <Button
              type="button"
              variant="outline"
              palette="neutral"
              size="sm"
              onClick={chooseNativeFolder}
              className="self-start">
              <FolderSearch className="h-4 w-4" aria-hidden />
              {t('projects.browse_open')}
            </Button>
          )}

          <div className="border-surface-200 dark:border-dark-surface-600 max-h-72 min-h-[11rem] overflow-y-auto rounded-lg border p-2">
            {files.error ? (
              <div className="flex flex-col items-start gap-2 px-1 py-2">
                <span className="text-error-600 dark:text-dark-error-500 text-xs">
                  {files.error}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => files.refresh()}>
                  {t('common.retry')}
                </Button>
              </div>
            ) : files.rootLoading && nodes.length === 0 ? (
              <div className="text-text-muted dark:text-dark-text-muted flex items-center gap-2 px-1 py-3 text-xs">
                <Spinner size="sm" />
                {t('projects.browse_loading')}
              </div>
            ) : nodes.length === 0 ? (
              <span className="text-text-muted dark:text-dark-text-muted block px-1 py-3 text-xs">
                {t('projects.browse_empty')}
              </span>
            ) : (
              <FileTree
                nodes={nodes}
                directoryClickMode="expand"
                defaultExpanded={new Set<string>()}
                selectedId={selectedRel ?? undefined}
                onNodeSelect={handleNodeSelect}
              />
            )}
          </div>


          <div className="border-surface-200 dark:border-dark-surface-600 bg-surface-50 dark:bg-dark-surface-100 rounded-lg border px-3 py-2">
            <span className="text-text-muted dark:text-dark-text-muted block text-[11px] font-medium tracking-wide uppercase">
              {t('projects.selected_label')}
            </span>
            {selectedAbsolute ? (
              <span
                className="text-text dark:text-dark-text mt-0.5 block truncate font-mono text-xs"
                title={selectedAbsolute}>
                {selectedAbsolute}
              </span>
            ) : (
              <span className="text-text-muted dark:text-dark-text-muted mt-0.5 block text-xs">
                {t('projects.selected_none')}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => switchMode('manual')}
            className="text-primary-600 hover:text-primary-700 dark:text-dark-primary-500 dark:hover:text-dark-primary-400 inline-flex items-center gap-1.5 self-start text-xs">
            <Keyboard className="h-3.5 w-3.5" aria-hidden />
            {t('projects.manual_toggle')}
          </button>
        </>
      ) : (
        <>
          <FormField label={t('projects.path_label')} required>
            <Input
              autoFocus
              value={manualPath}
              onChange={e => setManualPath(e.target.value)}
              placeholder={t('projects.path_placeholder')}
              required
            />
          </FormField>
          {nativePicker && (
            <Button
              type="button"
              variant="outline"
              palette="neutral"
              size="sm"
              onClick={chooseNativeFolder}
              className="self-start">
              <FolderSearch className="h-4 w-4" aria-hidden />
              {t('projects.browse_open')}
            </Button>
          )}
          {hasRoots && (
            <button
              type="button"
              onClick={() => switchMode('browse')}
              className="text-primary-600 hover:text-primary-700 dark:text-dark-primary-500 dark:hover:text-dark-primary-400 inline-flex items-center gap-1.5 self-start text-xs">
              <FolderSearch className="h-3.5 w-3.5" aria-hidden />
              {t('projects.browse_toggle')}
            </button>
          )}
        </>
      )}

      <FormField label={t('projects.name_label')}>
        <Input
          value={name}
          onChange={e => {
            setName(e.target.value);
            setNameEdited(true);
          }}
          placeholder={t('projects.name_placeholder')}
        />
      </FormField>

      {existingRoot && !addErrorMessage && (
        <InlineNotice variant="info">
          {t('projects.already_project', { name: projectName(existingRoot) })}
        </InlineNotice>
      )}

      {addErrorMessage && (
        <InlineNotice variant="error" role="alert">
          {addErrorMessage}
        </InlineNotice>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" palette="neutral" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!canSubmit} isLoading={addMutation.isPending}>
          {addMutation.isPending
            ? t('projects.add_submitting')
            : existingRoot
              ? t('projects.add_update')
              : t('projects.add_submit')}
        </Button>
      </div>
    </form>
  );
}
