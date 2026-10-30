import { Button, RadioCardGroup, Section } from '@contenox/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CLOUD_PROVIDER_SETUPS, getCloudProviderSetup } from '../../lib/providerCatalog';
import type { CloudProviderType } from '../../lib/types';
import BackendsSection from '../../pages/admin/backends/components/BackendsSection';
import ProviderForm from '../../pages/admin/backends/components/ProviderForm';
import { CODEX } from './useSignInFlow';

const OTHER_PROVIDERS = CLOUD_PROVIDER_SETUPS.filter(s => s.provider !== CODEX);

type Props = {
  onBack: () => void;
  onSaved: (provider: string) => void;
};

/** Pick a non-ChatGPT provider and connect it (API-key form, or the local-backend section). */
export function OtherProvidersPanel({ onBack, onSaved }: Props) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<CloudProviderType>(OTHER_PROVIDERS[0].provider);
  const setup = getCloudProviderSetup(choice);

  return (
    <div className="flex w-full flex-col gap-5">
      <RadioCardGroup
        aria-label={t('signin.others_title')}
        value={choice}
        onChange={setChoice}
        options={OTHER_PROVIDERS.map(p => ({ value: p.provider, label: t(p.titleKey) }))}
      />

      <Section title={t(setup.titleKey)}>
        {choice === 'ollama' ? (
          <BackendsSection />
        ) : (
          <ProviderForm key={choice} setup={setup} onSaved={() => onSaved(choice)} />
        )}
      </Section>

      <Button variant="outline" size="lg" className="w-full" onClick={onBack}>
        {t('signin.back')}
      </Button>
    </div>
  );
}
