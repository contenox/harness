import { Button, H2, P, Panel } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function ProvidersLinkSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Panel variant="surface">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <H2>{t('settings.manage_providers_title')}</H2>
          <P variant="muted" className="text-sm">
            {t('settings.manage_providers_description')}
          </P>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/backends')}>
          {t('settings.manage_providers_action')}
        </Button>
      </div>
    </Panel>
  );
}
