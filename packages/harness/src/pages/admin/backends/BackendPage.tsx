import { Container, Page, TabbedPage } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ProviderList } from '../../../components/providers/ProviderList';
import { useRuntimeBackendState } from '../../../hooks/useRuntimeBackendState';
import BackendsSection from './components/BackendsSection';
import RuntimeStateSection from './components/RuntimeStateSection';

const BACKEND_TAB_IDS = ['providers', 'backends', 'state'] as const;
const DEFAULT_TAB = 'providers';
/** Old links used "cloud-providers" for what is now the provider list. */
const TAB_ALIASES: Record<string, string> = { 'cloud-providers': 'providers' };

export default function BackendsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') ?? DEFAULT_TAB;
  const rawTab = TAB_ALIASES[requested] ?? requested;
  const activeTab = (BACKEND_TAB_IDS as readonly string[]).includes(rawTab) ? rawTab : DEFAULT_TAB;
  const runtime = useRuntimeBackendState();

  const tabs = [
    {
      id: 'providers',
      label: t('backends.tab_providers'),
      content: <ProviderList includeChatGpt />,
    },
    {
      id: 'backends',
      label: t('backends.tab_backends'),
      content: <BackendsSection />,
    },
    {
      id: 'state',
      label: t('state.runtime_tab'),
      content: (
        <RuntimeStateSection
          data={runtime.data}
          isLoading={runtime.isLoading}
          isError={runtime.isError}
          errorMessage={runtime.error?.message}
        />
      ),
    },
  ];

  return (
    <Page bodyScroll="auto" className="h-full">
      <Container padding="px-4 py-4 sm:px-6" innerPadding="p-0">
        {/* One centered column for tabs and content, so the tab bar lines up with what it shows. */}
        <div className="mx-auto w-full max-w-3xl">
          <TabbedPage
            tabs={tabs}
            mountActivePanelOnly
            activeTab={activeTab}
            onTabChange={id => {
              setSearchParams(
                prev => {
                  const next = new URLSearchParams(prev);
                  next.set('tab', id);
                  return next;
                },
                { replace: true },
              );
            }}
          />
        </div>
      </Container>
    </Page>
  );
}
