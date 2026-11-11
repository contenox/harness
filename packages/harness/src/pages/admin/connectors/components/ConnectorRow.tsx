import {
  Button,
  Dropdown,
  DropdownItem,
  IconButton,
  InlineNotice,
  SettingsRow,
  Spinner,
  StatusDot,
} from '@contenox/ui';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConnectorDetails } from '../../../../components/connectors/ConnectorDetails';
import {
  ConnectorForm,
  type WorkspaceChoice,
} from '../../../../components/connectors/ConnectorForm';
import { ConnectorIcon } from '../../../../components/connectors/ConnectorIcon';
import { ConnectorToolsPanel } from '../../../../components/connectors/ConnectorToolsPanel';
import { ToolRulesPanel } from '../../../../components/connectors/ToolRulesPanel';
import {
  useCheckConnector,
  useMcpServer,
  useRemoteTools,
  useRemoveConnector,
  useSaveConnector,
  useStartMcpSignIn,
} from '../../../../hooks/useConnectors';
import { formFromMcpServer, formFromRemoteTools } from '../../../../lib/connectorForm';
import {
  connectorDot,
  connectorSummaryKey,
  connectorWhere,
  isOwnedConnector,
} from '../../../../lib/connectorStatus';
import type { Connector } from '../../../../lib/connectorTypes';
import { hasPolicies } from '../../../../lib/toolPolicies';

type Props = {
  connector: Connector;
  workspaces: WorkspaceChoice[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function ConnectorRow({ connector, workspaces, expanded, onExpandedChange }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'edit' | 'remove' | null>(null);
  const check = useCheckConnector();
  const signIn = useStartMcpSignIn();
  const owned = isOwnedConnector(connector);
  const editing = mode === 'edit';
  const mcp = useMcpServer(editing && connector.kind === 'mcp' ? connector.id : undefined);
  const remote = useRemoteTools(editing && connector.kind === 'openapi' ? connector.id : undefined);
  const save = useSaveConnector();
  const remove = useRemoveConnector();
  const loaded =
    connector.kind === 'mcp'
      ? mcp.data && formFromMcpServer(mcp.data)
      : remote.data && formFromRemoteTools(remote.data);
  const loadError = mcp.error ?? remote.error;
  const summary =
    connector.status === 'ready'
      ? t('connectors.status.ready_count', { count: connector.tools.length })
      : t(connectorSummaryKey(connector));

  const open = (next: 'edit' | 'remove') => {
    setMode(next);
    onExpandedChange(true);
  };

  return (
    <SettingsRow
      icon={<ConnectorIcon connector={connector} />}
      title={connector.label}
      description={connector.kind === 'builtin' ? summary : connectorWhere(connector)}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      trailing={
        <>
          <StatusDot status={connectorDot(connector, check.isPending)} aria-label={summary} />
          {owned && (
            <Dropdown
              align="end"
              contentClassName="min-w-[10rem]"
              trigger={
                <IconButton
                  label={t('connectors.menu', { name: connector.label })}
                  size="xs"
                  noTooltip>
                  <MoreHorizontal className="size-3.5" aria-hidden />
                </IconButton>
              }>
              <DropdownItem icon={<Pencil className="size-3.5" />} onClick={() => open('edit')}>
                {t('connectors.edit')}
              </DropdownItem>
              <DropdownItem
                danger
                icon={<Trash2 className="size-3.5" />}
                onClick={() => open('remove')}>
                {t('connectors.remove')}
              </DropdownItem>
            </Dropdown>
          )}
        </>
      }>
      <div className="flex flex-col gap-4">
        {mode === 'remove' && (
          <InlineNotice variant="warning" className="flex flex-col gap-3">
            <span>{t('connectors.remove_confirm', { name: connector.label })}</span>
            {remove.error && <span role="alert">{remove.error.message}</span>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode(null)}>
                {t('connectors.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={remove.isPending}
                onClick={() => remove.mutate(connector, { onSuccess: () => setMode(null) })}>
                {t('connectors.remove_confirm_action')}
              </Button>
            </div>
          </InlineNotice>
        )}
        {editing ? (
          loadError ? (
            <InlineNotice variant="error" role="alert">
              {loadError.message}
            </InlineNotice>
          ) : loaded ? (
            <ConnectorForm
              initial={loaded}
              editing
              takenNames={[]}
              workspaces={workspaces}
              pending={save.isPending}
              error={save.error?.message}
              onSave={values =>
                save.mutate({ values, existing: connector }, { onSuccess: () => setMode(null) })
              }
              onCancel={() => setMode(null)}
            />
          ) : (
            <div className="flex justify-center py-4" role="status">
              <Spinner />
            </div>
          )
        ) : (
          <ConnectorDetails
            connector={connector}
            checking={check.isPending}
            checkError={check.error?.message}
            signingIn={signIn.isPending}
            signInError={signIn.error?.message}
            onCheck={() => check.mutate(connector.name)}
            onSignIn={
              connector.kind === 'mcp' && connector.id
                ? () => signIn.mutate(connector.id!)
                : undefined
            }
            extra={
              <>
                <ConnectorToolsPanel connector={connector} workspaces={workspaces} />
                {connector.kind === 'builtin' && hasPolicies(connector.name) && (
                  <ToolRulesPanel toolset={connector.name} workspaces={workspaces} />
                )}
              </>
            }
          />
        )}
      </div>
    </SettingsRow>
  );
}
