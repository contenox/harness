import { Button, FormField, H2, Input, P, Select } from '@contenox/ui';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePutCLIConfig } from '../../../hooks/usePutCLIConfig';
import type { SetupStatus } from '../../../lib/types';

type Props = {
  data: SetupStatus | undefined;
  onRefreshStatus: () => void;
  onSaved?: () => void;
};

export default function StepSetModel({ data, onRefreshStatus, onSaved }: Props) {
  const { t } = useTranslation();
  const putConfig = usePutCLIConfig();
  const formId = useId();

  const hasDefaults = !!(data?.defaultModel || data?.defaultProvider);

  const [model, setModel] = useState(data?.defaultModel ?? '');
  const [provider, setProvider] = useState(data?.defaultProvider ?? '');
  const [defaultChain, setDefaultChain] = useState(data?.defaultChain ?? '');

  const allModels = Array.from(
    new Set((data?.backendChecks ?? []).flatMap(b => b.chatModels ?? [])),
  );
  const hasModels = allModels.length > 0;
  const providerOptions = Array.from(
    new Set(
      (data?.backendChecks ?? [])
        .filter(b => b.reachable || b.chatModelCount > 0)
        .map(b => b.type),
    ),
  );
  if (provider && !providerOptions.includes(provider)) providerOptions.unshift(provider);
  if (model && !allModels.includes(model)) allModels.unshift(model);

  useEffect(() => {
    setModel(data?.defaultModel ?? '');
    setProvider(data?.defaultProvider ?? '');
    setDefaultChain(data?.defaultChain ?? '');
  }, [data]);

  useEffect(() => {
    if (model !== '' || allModels.length === 0) return;
    const preferred = allModels.find(m => m === 'gpt-5.4') ?? allModels[0];
    setModel(preferred);
  }, [allModels, model]);

  useEffect(() => {
    if (provider !== '' || providerOptions.length !== 1) return;
    setProvider(providerOptions[0]);
  }, [provider, providerOptions]);

  useEffect(() => {
    if (putConfig.isSuccess) {
      onRefreshStatus();
      onSaved?.();
      const timer = window.setTimeout(() => putConfig.reset(), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [putConfig.isSuccess, putConfig.reset, onRefreshStatus, onSaved]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: { 'default-model'?: string; 'default-provider'?: string; 'default-chain'?: string } = {};
    if (model.trim()) body['default-model'] = model.trim();
    if (provider.trim()) body['default-provider'] = provider.trim();
    if (defaultChain.trim()) body['default-chain'] = defaultChain.trim();
    if (!Object.keys(body).length) return;
    putConfig.mutate(body);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="space-y-1">
        <H2 className="text-xl font-semibold">{t('onboarding.step_set_model.title')}</H2>
        <P variant="muted" className="text-sm">
          {t('onboarding.step_set_model.desc')}
        </P>
      </div>

      {!hasModels && !hasDefaults && (
        <P variant="muted" className="text-sm">
          {t('onboarding.step_set_model.no_models')}
        </P>
      )}

      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <FormField label={t('onboarding.step_set_model.model_label')}>
          {hasModels ? (
            <Select
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={t('onboarding.step_set_model.model_placeholder')}
              options={allModels.map(m => ({ value: m, label: m }))}
            />
          ) : (
            <Input
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={t('onboarding.step_set_model.model_placeholder')}
            />
          )}
        </FormField>

        <FormField label={t('onboarding.step_set_model.provider_label')}>
          {providerOptions.length > 0 ? (
            <Select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              placeholder={t('onboarding.step_set_model.provider_placeholder')}
              options={providerOptions.map(p => ({ value: p, label: p }))}
            />
          ) : (
            <Input
              value={provider}
              onChange={e => setProvider(e.target.value)}
              placeholder={t('onboarding.step_set_model.provider_placeholder')}
            />
          )}
        </FormField>

        <FormField label={t('onboarding.step_set_model.chain_label')}>
          <Input
            value={defaultChain}
            onChange={e => setDefaultChain(e.target.value)}
            placeholder={t('onboarding.step_set_model.chain_placeholder')}
          />
          <P variant="muted" className="text-xs mt-1">
            {t('onboarding.step_set_model.chain_help')}
          </P>
        </FormField>

        {putConfig.isError && (
          <P className="text-error text-sm">{putConfig.error.message}</P>
        )}
        {putConfig.isSuccess && (
          <P variant="muted" className="text-sm">{t('onboarding.step_set_model.saved')}</P>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={putConfig.isPending || !model.trim() || !provider.trim()}>
          {t('onboarding.step_set_model.save')}
        </Button>
      </form>
    </div>
  );
}
