import { useTranslation } from 'react-i18next';
import type { SetupStatus } from '../../lib/types';
import { LocalModels } from '../localAI/LocalModels';
import { ChatGptLoginPanel } from './ChatGptLoginPanel';
import { FinishingPanel } from './FinishingPanel';
import { OtherProvidersPanel } from './OtherProvidersPanel';
import { SignInHero } from './SignInHero';
import { useSignInFlow } from './useSignInFlow';

type Props = {
  data: SetupStatus | undefined;
};

/**
 * First-run screen shown while setup is incomplete. Leads with the ChatGPT (Codex) device-code
 * login; other providers are a secondary path. Once a provider is ready, the default
 * provider + model are picked automatically and Layout swaps this screen for the app.
 */
export function SignInScreen({ data }: Props) {
  const { t } = useTranslation();
  const flow = useSignInFlow(data);
  const finishing = flow.showWorking || flow.showManual;
  const providerList = flow.view === 'others' && !flow.finishing;
  if (flow.view === 'local')
    return (
      <div className="bg-app h-full overflow-y-auto px-4 py-8 sm:px-6">
        <LocalModels onboarding onBack={() => flow.setView('codex')} />
      </div>
    );

  return (
    <div className="bg-app flex h-full min-h-0 flex-col items-center overflow-y-auto px-4 py-10">
      <div
        className={`m-auto flex w-full flex-col items-center gap-8 ${providerList ? 'max-w-md' : 'max-w-sm'}`}>
        {providerList ? (
          <>
            <SignInHero />
            <OtherProvidersPanel
              onBack={() => flow.setView('codex')}
              onConnected={flow.onConnected}
            />
          </>
        ) : (
          <>
            <SignInHero
              title={finishing ? t('signin.finishing_title') : t('localAI.welcome')}
              subtitle={finishing ? undefined : t('localAI.intro')}
            />
            {finishing ? (
              <FinishingPanel
                manual={flow.showManual}
                data={data}
                provider={flow.readyProvider}
                checking={flow.checking}
                onCheckAgain={flow.checkAgain}
              />
            ) : (
              <ChatGptLoginPanel
                onSignedIn={flow.onCodexSignedIn}
                onUseLocal={() => flow.setView('local')}
                onUseOtherProviders={() => flow.setView('others')}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
