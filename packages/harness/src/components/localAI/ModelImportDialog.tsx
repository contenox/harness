import { Button, Dialog, FormField, InlineNotice, Input, SecretInput, Select } from '@contenox/ui';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalAI, type ModelOperation } from '../../lib/localAI';
import { modelSourceUrl, modelUpload, type ImportSource } from '../../lib/modelImport';

import { ModelProgress } from './ModelProgress';

interface Props {
  operation?: ModelOperation;
  names: string[];
  onClose: () => void;
  onOperation: (operation: ModelOperation) => void;
  onRegistered: () => void;
}

export function ModelImportDialog({ names, operation, onClose, onOperation, onRegistered }: Props) {
  const { t } = useTranslation();
  const localAI = useLocalAI();
  const [source, setSource] = useState<ImportSource>('file');
  const [hasAdapter, setHasAdapter] = useState(false);
  const [submittingName, setSubmittingName] = useState('');
  const pending = Boolean(submittingName);
  const [error, setError] = useState('');
  const registration = useRef<{ name: string; url: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (abort.current) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const controller = new AbortController();
    abort.current = controller;
    setError('');
    setSubmittingName(name);
    try {
      const exists = names.some(item => item.toLowerCase() === name.toLowerCase());
      let operation: ModelOperation;
      if (source === 'url' || source === 'hub') {
        let url: URL;
        try {
          url = modelSourceUrl(data, source);
        } catch {
          throw new Error(t('localAI.importSourceError'));
        }
        if (registration.current?.name !== name || registration.current.url !== url.href) {
          if (exists) throw new Error(t('localAI.importNameUsed'));
          await localAI.register(name, url.href);
          registration.current = { name, url: url.href };
          onRegistered();
        }
        if (controller.signal.aborted) return;
        operation = await localAI.start(
          name,
          'download',
          String(data.get('token') ?? '').trim(),
          url.origin,
        );
      } else {
        if (exists) throw new Error(t('localAI.importNameUsed'));
        let upload: ReturnType<typeof modelUpload>;
        try {
          const adapter = data.get('adapter');
          upload = modelUpload(
            data.getAll('files').filter((item): item is File => item instanceof File),
            source,
            adapter instanceof File && adapter.size
              ? { file: adapter, scale: Number(data.get('strength') || 1) }
              : undefined,
          );
        } catch {
          throw new Error(t('localAI.importBundleError'));
        }
        operation = await localAI.upload(name, upload.engine, upload.body, controller.signal);
      }
      if (controller.signal.aborted) return;
      onOperation(operation);
      if (operation.phase === 'failed') throw new Error(operation.error);
      onClose();
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      abort.current = null;
      if (!controller.signal.aborted) setSubmittingName('');
    }
  }
  const close = () => {
    abort.current?.abort();
    onClose();
  };
  return (
    <Dialog open title={t('localAI.importModel')} closeLabel={t('common.close')} onClose={close}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending} className="space-y-3">
          <FormField label={t('localAI.importName')}>
            <Input
              name="name"
              required
              maxLength={96}
              pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]*"
              placeholder="my-model"
            />
          </FormField>
          <FormField label={t('localAI.importSource')}>
            <Select
              value={source}
              options={(['file', 'folder', 'hub', 'url'] as const).map(value => ({
                value,
                label: t(`localAI.importKinds.${value}`),
              }))}
              onChange={e => {
                setHasAdapter(false);
                setSource(e.target.value as ImportSource);
                setError('');
              }}
            />
          </FormField>
          <div key={source} className="space-y-3">
            {(source === 'file' || source === 'folder') && (
              <FormField
                label={t(`localAI.importKinds.${source}`)}
                description={t('localAI.importFormats')}>
                <Input
                  type="file"
                  name="files"
                  required
                  accept={source === 'file' ? '.gguf' : undefined}
                  {...(source === 'folder' ? { webkitdirectory: '', multiple: true } : {})}
                />
              </FormField>
            )}
            {source === 'file' && (
              <details className="space-y-3 text-sm">
                <summary className="cursor-pointer">{t('localAI.importLoRA')}</summary>
                <FormField label={t('localAI.adapterFile')} description={t('localAI.adapterHelp')}>
                  <Input
                    type="file"
                    name="adapter"
                    accept=".gguf"
                    onChange={event => setHasAdapter(Boolean(event.target.files?.length))}
                  />
                </FormField>
                {hasAdapter && (
                  <FormField label={t('localAI.adapterStrength')}>
                    <Input
                      name="strength"
                      type="number"
                      min="0.001"
                      step="any"
                      defaultValue="1"
                      required
                    />
                  </FormField>
                )}
              </details>
            )}
            {source === 'url' && (
              <FormField label={t('localAI.importUrl')}>
                <Input type="url" name="url" required placeholder="https://…/model.gguf" />
              </FormField>
            )}
            {source === 'hub' && (
              <>
                <FormField label={t('localAI.importRepo')}>
                  <Input name="repo" required placeholder="owner/repository" />
                </FormField>
                <FormField label={t('localAI.importFile')}>
                  <Input name="filename" required placeholder="model.gguf" />
                </FormField>
                <FormField label={t('localAI.importRevision')}>
                  <Input name="revision" defaultValue="main" />
                </FormField>
                <FormField label={t('localAI.importEndpoint')}>
                  <Input type="url" name="endpoint" defaultValue="https://huggingface.co" />
                </FormField>
              </>
            )}
            {(source === 'hub' || source === 'url') && (
              <FormField label={t('localAI.token')} description={t('localAI.importTokenHint')}>
                <SecretInput
                  name="token"
                  autoComplete="off"
                  showLabel={t('connectors.form.show')}
                  hideLabel={t('connectors.form.hide')}
                />
              </FormField>
            )}
          </div>
        </fieldset>
        {pending && (source === 'file' || source === 'folder') && (
          <div role="status" className="space-y-1">
            <p className="text-text-muted text-xs">{t('localAI.importing')}</p>
            <ModelProgress
              operation={
                operation?.model === submittingName && operation.action === 'import'
                  ? operation
                  : undefined
              }
              label={t('localAI.importing')}
            />
          </div>
        )}
        {error && (
          <InlineNotice variant="error" role="alert">
            {error}
          </InlineNotice>
        )}
        <div className="flex gap-2">
          <Button type="submit" isLoading={pending}>
            {t('localAI.importModel')}
          </Button>
          <Button type="button" variant="outline" onClick={close}>
            {t('localAI.cancel')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
