import { H1, P, Page } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { AccessSettingsSection } from './AccessSettingsSection';
import { AgentIdentitySection } from './AgentIdentitySection';
import { GlobalSettingsSection } from './GlobalSettingsSection';
import { LocaleSettingsSection } from './LocaleSettingsSection';
import { MissionSettingsSection } from './MissionSettingsSection';
import { ProvidersLinkSection } from './ProvidersLinkSection';
import { ResponseSettingsSection } from './ResponseSettingsSection';
import { ShellEnvSettingsSection } from './ShellEnvSettingsSection';
import { TelemetrySettingsSection } from './TelemetrySettingsSection';
import { UnofficialSignInsSection } from './UnofficialSignInsSection';
import { WorkspaceSettingsSection } from './WorkspaceSettingsSection';

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <Page bodyScroll="auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
        <div className="space-y-1">
          <H1 variant="page">{t('settings.page_title')}</H1>
          <P variant="muted" className="max-w-2xl text-sm">
            {t('settings.page_description')}
          </P>
        </div>
        <GlobalSettingsSection />
        <ResponseSettingsSection />
        <LocaleSettingsSection />
        <WorkspaceSettingsSection />
        <MissionSettingsSection />
        <AgentIdentitySection />
        <ShellEnvSettingsSection />
        <TelemetrySettingsSection />
        <AccessSettingsSection />
        <UnofficialSignInsSection />
        <ProvidersLinkSection />
      </div>
    </Page>
  );
}
