import { Button, InlineNotice } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useClearHiddenModels } from '../../hooks/useConnections';
import type { Connection } from '../../lib/types';

type Props = {
  connection: Connection;
};

export function HiddenModelsNotice({ connection }: Props) {
  const { t } = useTranslation();
  const clear = useClearHiddenModels();
  const models = connection.hiddenModels ?? [];
  if (models.length === 0) return null;

  return (
    <InlineNotice variant="info" className="flex flex-col gap-2">
      <span>{t('connections.hidden_models')}</span>
      <ul className="flex flex-col gap-1">
        {models.map(model => (
          <li key={model} className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs">{model}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t('connections.hidden_models_show_label', { model })}
              isLoading={clear.isPending && clear.variables?.model === model}
              onClick={() => clear.mutate({ id: connection.id, model })}>
              {t('connections.hidden_models_show')}
            </Button>
          </li>
        ))}
      </ul>
      {clear.error && <span role="alert">{clear.error.message}</span>}
    </InlineNotice>
  );
}
