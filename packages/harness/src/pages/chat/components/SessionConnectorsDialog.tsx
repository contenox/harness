import {
  Button,
  Dialog,
  IconButton,
  InlineNotice,
  P,
  SettingsGroup,
  SettingsRow,
  Spinner,
  StatusDot,
  Switch,
} from '@contenox/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ConnectorForm } from '../../../components/connectors/ConnectorForm';
import { ConnectorIcon } from '../../../components/connectors/ConnectorIcon';
import type { AcpWorkspaceController } from '../../../hooks/acpWorkspaceController';
import { sessionServerFromForm } from '../../../lib/connectorForm';
import { connectorDot, connectorSummaryKey, connectorWhere } from '../../../lib/connectorStatus';
import type { Connector } from '../../../lib/connectorTypes';
import { connectorKeys } from '../../../lib/queryKeys';

type Props = {
  open: boolean;
  sessionId: string | null;
  controller: Pick<
    AcpWorkspaceController,
    | 'sessionConnectors'
    | 'setSessionConnector'
    | 'setSessionConnectorTool'
    | 'addSessionConnector'
    | 'removeSessionConnector'
  >;
  onClose: () => void;
};

const GROUPS: { scope: Connector['scope'] | 'builtin'; titleKey: string }[] = [
  { scope: 'session', titleKey: 'connectors.chat.group_chat' },
  { scope: 'workspace', titleKey: 'connectors.chat.group_workspace' },
  { scope: 'everywhere', titleKey: 'connectors.chat.group_everywhere' },
  { scope: 'builtin', titleKey: 'connectors.chat.group_builtin' },
];

export function SessionConnectorsDialog({ open, sessionId, controller, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('connectors.chat.title')}
      closeLabel={t('connectors.chat.close')}
      className="w-[min(40rem,calc(100vw-2rem))]">
      {open && (
        <SessionConnectorsPanel sessionId={sessionId} controller={controller} onClose={onClose} />
      )}
    </Dialog>
  );
}

export function SessionConnectorsPanel({ sessionId, controller, onClose }: Omit<Props, 'open'>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const key = connectorKeys.session(sessionId ?? '');

  const list = useQuery<Connector[], Error>({
    queryKey: key,
    queryFn: () => controller.sessionConnectors(sessionId!),
    enabled: !!sessionId,
    staleTime: 0,
    retry: false,
  });
  const put = (next: Connector[]) => queryClient.setQueryData(key, next);

  const toggle = useMutation<Connector[], Error, { name: string; enabled: boolean }>({
    mutationFn: ({ name, enabled }) => controller.setSessionConnector(sessionId!, name, enabled),
    onSuccess: put,
  });
  const toolToggle = useMutation<
    Connector[],
    Error,
    { name: string; tool: string; enabled: boolean }
  >({
    mutationFn: ({ name, tool, enabled }) =>
      controller.setSessionConnectorTool(sessionId!, name, tool, enabled),
    onSuccess: put,
  });
  const add = useMutation<Connector[], Error, Parameters<typeof sessionServerFromForm>[0]>({
    mutationFn: values => controller.addSessionConnector(sessionId!, sessionServerFromForm(values)),
    onSuccess: next => {
      put(next);
      setAdding(false);
      setFormKey(k => k + 1);
    },
  });
  const remove = useMutation<Connector[], Error, string>({
    mutationFn: name => controller.removeSessionConnector(sessionId!, name),
    onSuccess: put,
  });

  const all = list.data ?? [];
  const groupOf = (c: Connector) => (c.kind === 'builtin' ? 'builtin' : c.scope);
  const takenNames = all.filter(c => c.scope === 'session').map(c => c.label);
  const actionError = toggle.error ?? remove.error ?? toolToggle.error;

  const row = (c: Connector) => {
    const enabled = c.enabled !== false;
    const summary =
      c.status === 'ready'
        ? t('connectors.status.ready_count', { count: c.tools.length })
        : t(connectorSummaryKey(c));
    return (
      <SettingsRow
        key={c.name}
        icon={<ConnectorIcon connector={c} />}
        title={c.label}
        description={
          c.kind === 'builtin' ? summary : [summary, connectorWhere(c)].filter(Boolean).join(' · ')
        }
        trailing={
          <>
            <StatusDot status={connectorDot(c)} aria-label={summary} />
            {c.scope === 'session' && (
              <IconButton
                label={t('connectors.chat.remove')}
                size="xs"
                disabled={remove.isPending}
                onClick={() => remove.mutate(c.name)}>
                <Trash2 className="size-3.5" aria-hidden />
              </IconButton>
            )}
            <Switch
              checked={enabled}
              disabled={toggle.isPending}
              aria-label={t('connectors.chat.toggle', { name: c.label })}
              onChange={e => toggle.mutate({ name: c.name, enabled: e.target.checked })}
            />
          </>
        }
        expanded={open === c.name}
        onExpandedChange={x => setOpen(x ? c.name : null)}>
        {c.tools.length > 0 ? (
          <div className="flex flex-col gap-2">
            {!enabled && (
              <P variant="muted" className="text-xs">
                {t('connectors.chat.tools_off')}
              </P>
            )}
            <SettingsGroup>
              {c.tools.map(tool => {
                const bySettings = (c.hiddenBySettings ?? []).includes(tool.name);
                const inChat = (c.hiddenInChat ?? []).includes(tool.name);
                return (
                  <SettingsRow
                    key={tool.name}
                    title={<span className="font-mono text-xs">{tool.name}</span>}
                    description={
                      bySettings ? t('connectors.chat.hidden_by_settings') : tool.description
                    }
                    trailing={
                      <Switch
                        checked={!bySettings && !inChat}
                        disabled={bySettings || !enabled || toolToggle.isPending}
                        aria-label={t('connectors.tools.visible', { name: tool.name })}
                        onChange={e =>
                          toolToggle.mutate({
                            name: c.name,
                            tool: tool.name,
                            enabled: e.target.checked,
                          })
                        }
                      />
                    }
                  />
                );
              })}
            </SettingsGroup>
          </div>
        ) : undefined}
      </SettingsRow>
    );
  };

  return (
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
      <P variant="muted" className="text-sm">
        {t('connectors.chat.description')}
      </P>
      {!sessionId && <InlineNotice variant="info">{t('connectors.chat.not_ready')}</InlineNotice>}
      {sessionId && list.isLoading && (
        <div
          className="flex justify-center py-6"
          role="status"
          aria-label={t('connectors.chat.loading')}>
          <Spinner />
        </div>
      )}
      {list.error && (
        <InlineNotice variant="error" role="alert">
          {t('connectors.chat.load_error', { message: list.error.message })}
        </InlineNotice>
      )}
      {actionError && (
        <InlineNotice variant="error" role="alert">
          {actionError.message}
        </InlineNotice>
      )}
      {sessionId && list.data && (
        <>
          {GROUPS.map(g => {
            const items = all.filter(c => groupOf(c) === g.scope);
            if (g.scope !== 'session' && items.length === 0) return null;
            return (
              <SettingsGroup key={g.scope} title={t(g.titleKey as never)}>
                {items.map(row)}
                {g.scope === 'session' && (
                  <SettingsRow
                    icon={<Plus />}
                    title={t('connectors.chat.add')}
                    description={t('connectors.chat.add_description')}
                    expanded={adding}
                    onExpandedChange={setAdding}>
                    <ConnectorForm
                      key={formKey}
                      forChat
                      takenNames={takenNames}
                      pending={add.isPending}
                      error={add.error?.message}
                      onSave={values => add.mutate(values)}
                      onCancel={() => setAdding(false)}
                    />
                  </SettingsRow>
                )}
              </SettingsGroup>
            );
          })}
        </>
      )}
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="text"
          size="sm"
          onClick={() => {
            onClose();
            navigate('/connectors');
          }}>
          <Settings2 className="size-3.5" aria-hidden />
          {t('connectors.chat.manage')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {t('connectors.chat.close')}
        </Button>
      </div>
    </div>
  );
}
