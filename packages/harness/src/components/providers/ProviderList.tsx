import { Disclosure, InlineNotice, SettingsGroup, SettingsRow, Spinner } from '@contenox/ui';
import { useContext, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { useCLIConfig } from '../../hooks/useCLIConfig';
import { useConnections } from '../../hooks/useConnections';
import { AuthContext } from '../../lib/authContext';
import {
  getCloudProviderSetup,
  providersInGroup,
  type CloudProviderSetup,
  type ProviderGroup,
} from '../../lib/providerCatalog';
import {
  draftFor,
  groupConnections,
  initialProviderListState,
  providerListReducer,
} from '../../lib/providerListState';
import type { CloudProviderType, Connection } from '../../lib/types';
import { ProviderBody } from './ProviderBody';
import { RowStatus } from './RowStatus';
import { SignInSection } from './SignInSection';

export type ProviderListProps = {
  /** Show the sign-in rows (first run has ChatGPT on its own screen instead). */
  includeSignIns?: boolean;
  /** A connection was saved and verified available (or ChatGPT signed in). */
  onConnected?: (connection: Connection) => void;
};

const GROUP_TITLE = {
  recommended: 'providers.group_recommended',
  cloud: 'providers.group_cloud',
  local: 'providers.group_local',
} as const;

/**
 * "Anbieter verbinden": providers grouped as recommended / cloud / local / more, one row open at a
 * time. Each provider keeps its unsaved draft while other rows are opened; a successful save
 * clears it.
 */
export function ProviderList({ includeSignIns = false, onConnected }: ProviderListProps) {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const { data: config } = useCLIConfig(includeSignIns && !!user);
  const signInProviders: CloudProviderType[] = includeSignIns
    ? config?.unofficialSignIns === 'true'
      ? ['openai-codex', 'github-copilot']
      : ['openai-codex']
    : [];
  const [state, dispatch] = useReducer(providerListReducer, initialProviderListState);
  const { data, isLoading, error } = useConnections();
  const byType = groupConnections(data ?? []);

  const row = (setup: CloudProviderSetup) => {
    const connections = byType.get(setup.provider) ?? [];
    return (
      <SettingsRow
        key={setup.provider}
        icon={<setup.icon />}
        title={t(setup.titleKey)}
        description={t(setup.shortKey)}
        trailing={<RowStatus connections={connections} />}
        expanded={state.expanded === setup.provider}
        onExpandedChange={expanded =>
          dispatch({ type: 'expand', provider: setup.provider, expanded })
        }>
        <ProviderBody
          setup={setup}
          connections={connections}
          values={draftFor(state, setup)}
          onValuesChange={values => dispatch({ type: 'draft', provider: setup.provider, values })}
          onConnected={connection => {
            dispatch({ type: 'clearDraft', provider: setup.provider });
            onConnected?.(connection);
          }}
        />
      </SettingsRow>
    );
  };

  const signInRow = (provider: CloudProviderType) => {
    const connections = byType.get(provider) ?? [];
    const setup = getCloudProviderSetup(provider);
    return (
      <SettingsRow
        key={provider}
        icon={<setup.icon />}
        title={t(setup.titleKey)}
        description={t(setup.shortKey)}
        trailing={<RowStatus connections={connections} />}
        expanded={state.expanded === provider}
        onExpandedChange={expanded => dispatch({ type: 'expand', provider, expanded })}>
        <SignInSection provider={provider} connections={connections} onConnected={onConnected} />
      </SettingsRow>
    );
  };

  const group = (id: Exclude<ProviderGroup, 'more'>) => {
    const rows = providersInGroup(id).map(row);
    if (id === 'recommended') rows.unshift(...signInProviders.map(signInRow));
    return <SettingsGroup title={t(GROUP_TITLE[id])}>{rows}</SettingsGroup>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6" role="status">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <InlineNotice variant="error" role="alert">
          {error.message}
        </InlineNotice>
      )}
      {group('recommended')}
      {group('cloud')}
      {group('local')}
      <Disclosure label={t('providers.group_more')}>
        <SettingsGroup>{providersInGroup('more').map(row)}</SettingsGroup>
      </Disclosure>
    </div>
  );
}
