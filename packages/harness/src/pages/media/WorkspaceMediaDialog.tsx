import { Button, Dialog, FormField, InlineNotice, Select } from '@contenox/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useFilePreview } from '../../hooks/useFilePreview';
import { useWorkspaceFiles } from '../../hooks/useWorkspaceFiles';
import { useWorkspaceRoots } from '../../hooks/useWorkspaceRoots';
import { createLocalAI } from '../../lib/localAI';
import { hasProjectBridge } from '../../lib/projectRuntime';
import { projectForCwd } from '../../lib/workspaceRoots';
import { MentionFilePreview } from '../chat/components/MentionFilePreview';
import { relativeWorkspacePath } from '../chat/lib/workspaceRoot';

type Kind = 'image' | 'video';
const pipelines: Record<Kind, string> = { image: 'StableDiffusionPipeline', video: 'LTXPipeline' };

function GeneratedFile({ root, file }: { root: string; file: string }) {
  const files = useWorkspaceFiles(root);
  const preview = useFilePreview(file, files.readFile, 0);
  return <MentionFilePreview state={preview} />;
}

export function WorkspaceMediaDialog({
  root,
  onClose,
  onOpen,
}: {
  root: string;
  onClose: () => void;
  onOpen: (file: string) => void;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<Kind>('image');
  const [prompt, setPrompt] = useState('');
  const [seconds, setSeconds] = useState(2);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const projects = useWorkspaceRoots();
  const [generatedFile, setGeneratedFile] = useState('');
  const project = projectForCwd(root, projects.roots);
  const outputRoot = project?.path ?? root;
  const desktop = hasProjectBridge();
  const available = !desktop || !!project;
  const scope = desktop && project && !project.default ? project.path : '';
  const localAI = useMemo(() => createLocalAI(scope), [scope]);
  const inventory = useQuery({
    queryKey: localAI.keys.models,
    queryFn: localAI.models,
    enabled: available,
  });
  const selected = available
    ? inventory.data?.find(m => m.installed && m.mediaEnabled && m.pipeline === pipelines[kind])
    : undefined;
  const render = useMutation({
    mutationFn: async () => {
      const abort = new AbortController();
      controller.current = abort;
      try {
        if (!available) throw new Error(t('localAI.missingWorkspace'));
        return await localAI.renderMedia(outputRoot, kind, prompt.trim(), seconds, abort.signal);
      } finally {
        controller.current = null;
      }
    },
  });
  function generate() {
    if (!available || !selected || !prompt.trim() || controller.current) return;
    render.mutate(undefined, {
      onSuccess: ({ file }) => {
        const relative = relativeWorkspacePath(
          outputRoot + '/' + file,
          root,
          window.contenoxDesktop?.platform,
        );
        if (relative === null) {
          setGeneratedFile(file);
        } else {
          onOpen(relative);
          onClose();
        }
      },
    });
  }
  if (generatedFile) {
    return (
      <Dialog
        open
        title={t('mediaGeneration.title')}
        closeLabel={t('common.close')}
        onClose={onClose}>
        <GeneratedFile root={outputRoot} file={generatedFile} />
      </Dialog>
    );
  }
  return (
    <Dialog
      open
      title={t('mediaGeneration.title')}
      closeLabel={t('mediaGeneration.close')}
      onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={event => {
          event.preventDefault();
          generate();
        }}>
        <fieldset className="grid gap-3" disabled={render.isPending}>
          <FormField label={t('mediaGeneration.outputType')}>
            <Select
              value={kind}
              options={[
                { value: 'image', label: t('mediaGeneration.image') },
                { value: 'video', label: t('mediaGeneration.nativeVideo') },
              ]}
              onChange={event => {
                setKind(event.target.value as Kind);
                render.reset();
              }}
            />
          </FormField>
          {desktop && !project && !projects.isLoading && (
            <InlineNotice variant="error">
              {projects.error?.message ?? t('localAI.missingWorkspace')}
            </InlineNotice>
          )}
          {inventory.isLoading && <p role="status">{t('mediaGeneration.loadingModels')}</p>}
          {inventory.error && (
            <InlineNotice variant="error">{inventory.error.message}</InlineNotice>
          )}
          {available && inventory.isSuccess && !selected && (
            <p className="text-sm">
              {t(
                kind === 'video'
                  ? 'mediaGeneration.videoModelNeeded'
                  : 'mediaGeneration.modelNeeded',
              )}{' '}
              <Link
                className="text-link"
                to={'/local-models?workspace=' + encodeURIComponent(outputRoot)}>
                {t('localAI.inventory')}
              </Link>
            </p>
          )}
          {selected && (
            <p className="text-text-muted text-sm">
              {t('mediaGeneration.model')} Â· {selected.label || selected.name}
            </p>
          )}
          <FormField label={t('mediaGeneration.scene')}>
            <textarea
              required
              maxLength={1000}
              rows={3}
              value={prompt}
              className="border-line bg-surface w-full rounded border p-2"
              onChange={event => setPrompt(event.target.value)}
            />
          </FormField>
          {kind === 'video' && (
            <FormField label={t('mediaGeneration.duration')}>
              <Select
                value={String(seconds)}
                options={[1, 2, 3, 4].map(n => ({ value: String(n), label: n + ' s' }))}
                onChange={event => setSeconds(Number(event.target.value))}
              />
            </FormField>
          )}
        </fieldset>
        {render.error && <InlineNotice variant="error">{render.error.message}</InlineNotice>}
        {render.isPending ? (
          <div className="flex items-center justify-between gap-2">
            <span role="status">{t('mediaGeneration.rendering')}</span>
            <Button type="button" onClick={() => controller.current?.abort()}>
              {t('localAI.cancel')}
            </Button>
          </div>
        ) : (
          <Button
            type="submit"
            variant="primary"
            disabled={!available || !selected || !prompt.trim()}>
            {t(kind === 'image' ? 'mediaGeneration.makeImage' : 'mediaGeneration.videoAction')}
          </Button>
        )}
      </form>
    </Dialog>
  );
}
