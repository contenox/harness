import { Disclosure, InlineNotice, SettingsGroup, SettingsRow, Spinner } from '@contenox/ui';
import { MessageCircle } from 'lucide-react';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnections } from '../../hooks/useConnections';
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
import type { Connection } from '../../lib/types';
import { ChatGptSection } from './ChatGptSection';
import { ProviderBody } from './ProviderBody';
import { RowStatus } from './RowStatus';

export type ProviderListProps = {
  /** Show the ChatGPT subscription row (first run has it on its own screen instead). */
  includeChatGpt?: boolean;
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
export function ProviderList({ includeChatGpt = false, onConnected }: ProviderListProps) {
  const { t } = useTranslation();
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
        onExpandedChange={expanded => dispatch({ type: 'expand', provider: setup.provider, expanded })}>
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

  const chatGptRow = () => {
    const connections = byType.get('openai-codex') ?? [];
    const codex = getCloudProviderSetup('openai-codex');
    return (
      <SettingsRow
        key="openai-codex"
        icon={<MessageCircle />}
        title={t('cloud_providers.codex.title')}
        description={t(codex.shortKey)}
        trailing={<RowStatus connections={connections} />}
        expanded={state.expanded === 'openai-codex'}
        onExpandedChange={expanded => dispatch({ type: 'expand', provider: 'openai-codex', expanded })}>
        <ChatGptSection connections={connections} onConnected={onConnected} />
      </SettingsRow>
    );
  };

  const group = (id: Exclude<ProviderGroup, 'more'>) => {
    const rows = providersInGroup(id).map(row);
    if (id === 'recommended' && includeChatGpt) rows.unshift(chatGptRow());
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
