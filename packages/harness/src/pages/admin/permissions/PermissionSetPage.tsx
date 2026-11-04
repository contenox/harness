import { BackButton, Container, H1, InlineNotice, P, Page, SettingsGroup, Spinner } from '@contenox/ui';
import { FilePen, FileSearch, MessageCircleQuestion, Rocket, SquareTerminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCLIConfig } from '../../../hooks/useCLIConfig';
import { useEnvelopeSection, useRemoveEnvelope, useSaveEnvelope } from '../../../hooks/usePermissions';
import { CHAT_ENVELOPE, displayName, parentOf, policyEnvelopeName, rawEnvelopes } from '../../../lib/permissions';
import { AxisRow } from './components/AxisRow';
import { RemoveSet } from './components/RemoveSet';
import { ScopeBar } from './components/ScopeBar';
import { ToolsGroup } from './components/ToolsGroup';
import { permissionsPath, usePermissionScope } from './usePermissionScope';

export default function PermissionSetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { name = '' } = useParams<{ name: string }>();
  const permission = usePermissionScope();
  const section = useEnvelopeSection(permission.scope);
  const save = useSaveEnvelope(permission.scope, section.data);
  const remove = useRemoveEnvelope(permission.scope, section.data);
  const cliConfig = useCLIConfig(true);
  const missionSet = policyEnvelopeName(cliConfig.data?.defaultMissionPolicy);
  const items = section.data?.items ?? [];
  const item = items.find(i => i.name === name);
  const envelopes = rawEnvelopes(items);
  const raw = envelopes.get(name);
  const parent = parentOf(envelopes, name);
  const workspace = permission.scope.workspace;
  const workspaceName = workspace ? permission.workspaceName : undefined;
  const backTo = permissionsPath(undefined, workspace);

  const onSave = (patch: Record<string, unknown>) => save.mutateAsync({ name, patch });
  const common = {
    name,
    envelopes,
    layer: item?.layer,
    workspaceName,
    revision: section.data?.revision ?? '',
    onSave,
  };

  const inUseBy = [
    name === CHAT_ENVELOPE ? t('permissions.used_by_chats') : undefined,
    name === missionSet ? t('permissions.used_by_missions') : undefined,
  ].filter((v): v is string => v !== undefined);

  return (
    <Page bodyScroll="auto" className="h-full">
      <Container padding="px-4 py-4 sm:px-6" innerPadding="p-0">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <BackButton label={t('permissions.back')} onClick={() => navigate(backTo)} />
          <ScopeBar permission={permission} />
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
          {section.data && !raw && (
            <InlineNotice variant="warning">{t('permissions.not_found', { name })}</InlineNotice>
          )}
          {raw && (
            <>
              <div className="flex flex-col gap-1 px-1">
                <H1 className="text-lg">{displayName(name)}</H1>
                <P variant="muted" className="text-[13px]">
                  {typeof raw.description === 'string' && raw.description.trim()
                    ? raw.description
                    : t('permissions.no_description')}
                </P>
                {parent && (
                  <P variant="muted" className="text-xs">
                    <Link className="hover:text-text hover:underline" to={permissionsPath(parent, workspace)}>
                      {t('permissions.builds_on', { name: displayName(parent) })}
                    </Link>
                  </P>
                )}
              </div>
              <SettingsGroup title={t('permissions.group_files')}>
                <AxisRow axis="files.read" icon={<FileSearch />} {...common} />
                <AxisRow axis="files.write" icon={<FilePen />} {...common} />
              </SettingsGroup>
              <SettingsGroup title={t('permissions.group_commands')}>
                <AxisRow axis="shell" icon={<SquareTerminal />} {...common} />
              </SettingsGroup>
              <SettingsGroup title={t('permissions.group_missions')}>
                <AxisRow axis="missions.fire" icon={<Rocket />} {...common} />
                <AxisRow axis="missions.answer" icon={<MessageCircleQuestion />} {...common} />
              </SettingsGroup>
              <ToolsGroup
                scope={permission.scope}
                name={name}
                envelopes={envelopes}
                layer={item?.layer}
                workspaceName={workspaceName}
                onSave={onSave}
              />
              <RemoveSet
                name={name}
                workspaceName={workspaceName}
                inLayer={item?.inLayer ?? false}
                inUseBy={inUseBy}
                onRemove={async () => {
                  await remove.mutateAsync(name);
                  if (!workspace) navigate(backTo);
                }}
              />
            </>
          )}
        </div>
      </Container>
    </Page>
  );
}
