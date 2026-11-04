import { Badge, Container, InlineNotice, P, Page, SettingsGroup, SettingsRow, Spinner } from '@contenox/ui';
import { ChevronRight, ShieldCheck, ShieldHalf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useCLIConfig } from '../../../hooks/useCLIConfig';
import { useEnvelopeSection, useSaveEnvelope } from '../../../hooks/usePermissions';
import { CHAT_ENVELOPE, displayName, policyEnvelopeName, rawEnvelopes } from '../../../lib/permissions';
import { NewSetForm } from './components/NewSetForm';
import { ScopeBar } from './components/ScopeBar';
import { permissionsPath, usePermissionScope } from './usePermissionScope';

export default function PermissionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permission = usePermissionScope();
  const section = useEnvelopeSection(permission.scope);
  const save = useSaveEnvelope(permission.scope, section.data);
  const cliConfig = useCLIConfig(true);
  const missionSet = policyEnvelopeName(cliConfig.data?.defaultMissionPolicy);
  const items = section.data?.items ?? [];
  const envelopes = rawEnvelopes(items);
  const names = items.map(i => i.name);

  const usedBy = (name: string) => {
    const uses: string[] = [];
    if (name === CHAT_ENVELOPE) uses.push(t('permissions.used_by_chats'));
    if (name === missionSet) uses.push(t('permissions.used_by_missions'));
    return uses;
  };

  const row = (name: string) => {
    const item = items.find(i => i.name === name);
    const raw = envelopes.get(name);
    const description = typeof raw?.description === 'string' && raw.description.trim() ? raw.description : undefined;
    const changedHere = permission.scope.workspace !== undefined && item?.inLayer;
    return (
      <Link
        key={name}
        to={permissionsPath(name, permission.scope.workspace)}
        className="block transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60">
        <SettingsRow
          icon={usedBy(name).length > 0 ? <ShieldCheck /> : <ShieldHalf />}
          title={displayName(name)}
          description={description ?? t('permissions.no_description')}
          trailing={
            <>
              {usedBy(name).map(use => (
                <Badge key={use} size="sm" variant="outline">
                  {use}
                </Badge>
              ))}
              {changedHere && (
                <Badge size="sm" variant="accent">
                  {t('permissions.changed_here')}
                </Badge>
              )}
              <ChevronRight className="size-4 text-text-subtle" aria-hidden />
            </>
          }
        />
      </Link>
    );
  };

  const inUse = names.filter(n => usedBy(n).length > 0).sort((a, b) => (a === CHAT_ENVELOPE ? -1 : b === CHAT_ENVELOPE ? 1 : 0));
  const others = names.filter(n => usedBy(n).length === 0);

  const intro = permission.scope.workspace
    ? t('permissions.intro_workspace', { name: permission.workspaceName })
    : missionSet
      ? t('permissions.intro_home', { chat: displayName(CHAT_ENVELOPE), mission: displayName(missionSet) })
      : t('permissions.intro_home_no_mission', { chat: displayName(CHAT_ENVELOPE) });

  return (
    <Page bodyScroll="auto" className="h-full">
      <Container padding="px-4 py-4 sm:px-6" innerPadding="p-0">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <ScopeBar permission={permission} />
          <P variant="muted" className="px-1 text-[13px]">
            {intro}
          </P>
          {section.isLoading && (
            <div className="flex justify-center py-6" role="status">
              <Spinner />
            </div>
          )}
          {section.error && (
            <InlineNotice variant="error" role="alert">
              {t('permissions.load_error', { message: section.error.message })}
            </InlineNotice>
          )}
          {section.data && (
            <>
              {inUse.length > 0 && <SettingsGroup title={t('permissions.group_in_use')}>{inUse.map(row)}</SettingsGroup>}
              <SettingsGroup title={t('permissions.group_all')}>
                {others.map(row)}
                <NewSetForm
                  names={names}
                  onCreate={async (name, value) => {
                    await save.mutateAsync({ name, patch: value });
                    navigate(permissionsPath(name, permission.scope.workspace));
                  }}
                />
              </SettingsGroup>
            </>
          )}
        </div>
      </Container>
    </Page>
  );
}
