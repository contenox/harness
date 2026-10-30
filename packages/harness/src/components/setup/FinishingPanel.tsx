import { Button, FormField, InlineNotice, Span, Select, Spinner } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePutCLIConfig } from '../../hooks/usePutCLIConfig';
import { chatModelsFor } from '../../lib/defaultModel';
import type { SetupStatus } from '../../lib/types';

function SelectingModel() {
  const { t } = useTranslation();
  return (
    <Span variant="muted" className="flex items-center justify-center gap-2" role="status">
      <Spinner size="sm" />
      {t('signin.selecting_model')}
    </Span>
  );
}

type ManualProps = {
  data: SetupStatus | undefined;
  provider: string | undefined;
  checking: boolean;
  onCheckAgain: () => void;
};

/** Fallback when no default model could be chosen automatically: pick one by hand. */
function ManualModelSelect({ data, provider, checking, onCheckAgain }: ManualProps) {
  const { t } = useTranslation();
  const putConfig = usePutCLIConfig();
  const scoped = chatModelsFor(data, provider);
  const models = scoped.length > 0 ? scoped : chatModelsFor(data);
  const [model, setModel] = useState('');
  const selected = model || models[0] || '';

  const save = () => {
    const owner =
      (data?.backendChecks ?? []).find(b => b.chatModels?.includes(selected))?.type ?? provider;
    if (!selected || !owner) return;
    putConfig.mutate({ 'default-model': selected, 'default-provider': owner });
  };

  if (models.length === 0) {
    return (
      <div className="flex w-full flex-col gap-3">
        <InlineNotice variant="warning">{t('signin.no_models')}</InlineNotice>
        <Button variant="outline" size="lg" isLoading={checking} onClick={onCheckAgain}>
          {t('signin.check_again')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <FormField label={t('signin.model_label')}>
        <Select
          value={selected}
          onChange={e => setModel(e.target.value)}
          options={models.map(m => ({ value: m, label: m }))}
          className="w-full"
        />
      </FormField>
      {putConfig.isError && (
        <InlineNotice variant="error" role="alert">
          {putConfig.error.message}
        </InlineNotice>
      )}
      <Button size="lg" className="w-full" isLoading={putConfig.isPending} disabled={!selected} onClick={save}>
        {t('signin.save')}
      </Button>
    </div>
  );
}

type Props = ManualProps & { manual: boolean };

/** Last step: either the spinner while the default model is auto-selected, or the manual picker. */
export function FinishingPanel({ manual, ...rest }: Props) {
  return manual ? <ManualModelSelect {...rest} /> : <SelectingModel />;
}
