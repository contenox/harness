import { Button, H2, P } from '@contenox/ui';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Connection } from '../../lib/types';
import { ProviderList } from '../providers/ProviderList';

type Props = {
  onBack: () => void;
  onConnected: (connection: Connection) => void;
};

/**
 * "Anbieter verbinden" on first run: the shared provider list without ChatGPT (that is the
 * sign-in screen). A verified connection continues to the default-model step.
 */
export function OtherProvidersPanel({ onBack, onConnected }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          {t('signin.back')}
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <H2>{t('providers.title')}</H2>
        <P variant="muted" className="text-sm">
          {t('providers.description')}
        </P>
      </div>
      <ProviderList onConnected={onConnected} />
    </div>
  );
}
