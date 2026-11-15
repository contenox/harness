import { useTranslation } from 'react-i18next';
import type { SetupStatus } from '../../lib/types';
import { FinishingPanel } from './FinishingPanel';
import { OtherProvidersPanel } from './OtherProvidersPanel';
import { SignInHero } from './SignInHero';
import { SubscriptionLoginPanel } from './SubscriptionLoginPanel';
import { useSignInFlow } from './useSignInFlow';

type Props = {
  data: SetupStatus | undefined;
};

export function SignInScreen({ data }: Props) {
  const { t } = useTranslation();
  const flow = useSignInFlow(data);
  const finishing = flow.showWorking || flow.showManual;
  const providerList = flow.view === 'others' && !flow.finishing;

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
              title={finishing ? t('signin.finishing_title') : t('signin.title')}
              subtitle={finishing ? undefined : t('signin.subtitle')}
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
              <SubscriptionLoginPanel
                onSignedIn={flow.onSignedIn}
                onUseOtherProviders={() => flow.setView('others')}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
