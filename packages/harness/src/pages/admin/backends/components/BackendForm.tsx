import { Button, Form, FormField, Input, Panel, Section, Select, Spinner } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isHttpUrl } from '../../../../lib/providerSetupValues';
import { Backend } from '../../../../lib/types';

type BackendFormProps = {
  editingBackend: Backend | null;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  error: boolean;
  name: string;
  setName: (value: string) => void;
  baseURL: string;
  setBaseURL: (value: string) => void;
  configType: string;
  setConfigType: (value: string) => void;
};

export default function BackendForm({
  editingBackend,
  onCancel,
  onSubmit,
  isPending,
  error,
  name,
  setName,
  baseURL,
  setBaseURL,
  configType,
  setConfigType,
}: BackendFormProps) {
  const { t } = useTranslation();

  const [urlTouched, setUrlTouched] = useState(false);

  const trimmedURL = baseURL.trim();
  const urlMustBeHttp = configType === 'ollama' || configType === 'vllm';
  const urlError = !trimmedURL
    ? urlTouched || name.trim()
      ? t('backends.error_url_required')
      : undefined
    : urlMustBeHttp && !isHttpUrl(trimmedURL)
      ? t('providers.field.url_invalid')
      : undefined;
  const urlInvalid = !trimmedURL || (urlMustBeHttp && !isHttpUrl(trimmedURL));

  const isFormValid = name.trim() && !urlInvalid && configType.trim();

  return (
    <Section>
      <Form
        title={editingBackend ? t('backends.form_title_edit') : t('backends.form_title_create')}
        onSubmit={onSubmit}
        error={
          error
            ? t('errors.generic_upload', { action: editingBackend ? 'updating' : 'creating' })
            : undefined
        }
        actions={
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || !isFormValid}
              className="min-w-20">
              {isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {editingBackend ? t('common.updating') : t('common.creating')}
                </>
              ) : editingBackend ? (
                t('backends.form_update_action')
              ) : (
                t('backends.form_create_action')
              )}
            </Button>
            {editingBackend && (
              <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        }>
        <FormField label={t('common.name')} required tooltip={t('backends.tooltip_name')}>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="my-backend"
            disabled={isPending}
          />
        </FormField>

        <FormField
          label={t('backends.form_url')}
          required
          tooltip={t('backends.tooltip_url')}
          error={urlError}>
          <Input
            value={baseURL}
            onChange={e => {
              setUrlTouched(true);
              setBaseURL(e.target.value);
            }}
            error={!!urlError}
            placeholder={
              configType === 'local'
                ? '~/.contenox/models/'
                : configType === 'vllm'
                  ? 'http://gpu-host:8000'
                  : configType === 'modeld'
                    ? 'local or host:port (e.g. 100.64.0.5:1234)'
                    : configType === 'openvino'
                      ? '~/.contenox/models-ov/'
                      : 'http://localhost:11434'
            }
            disabled={isPending}
          />
        </FormField>

        <FormField label={t('backends.form_type')} required tooltip={t('backends.tooltip_type')}>
          <Select
            value={configType}
            onChange={e => setConfigType(e.target.value)}
            options={[
              { value: 'ollama', label: 'Ollama (local)' },
              { value: 'vllm', label: 'vLLM' },
              { value: 'local', label: 'Local (GGUF / llama.cpp)' },
              { value: 'openvino', label: 'OpenVINO (local IR)' },
              { value: 'modeld', label: 'modeld node (local or remote)' },
            ]}
            disabled={isPending}
          />
        </FormField>

        {configType === 'ollama' && <Panel variant="flat">{t('backends.hint_ollama')}</Panel>}
        {configType === 'vllm' && <Panel variant="flat">{t('backends.hint_vllm')}</Panel>}
        {configType === 'local' && <Panel variant="flat">{t('backends.hint_local')}</Panel>}
        {configType === 'openvino' && <Panel variant="flat">{t('backends.hint_openvino')}</Panel>}
        {configType === 'modeld' && <Panel variant="flat">{t('backends.hint_modeld')}</Panel>}
      </Form>
    </Section>
  );
}
