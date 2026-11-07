import { InlineNotice, P, Select, SettingsGroup, SettingsRow, Switch } from '@contenox/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { refreshConnectors } from '../../hooks/useConnectors';
import { api } from '../../lib/api';
import type { Connector } from '../../lib/connectorTypes';
import type { WorkspaceChoice } from './ConnectorForm';

export function samePath(a: string, b: string) {
  return a.replace(/[\\/]+$/, '').toLowerCase() === b.replace(/[\\/]+$/, '').toLowerCase();
}

export function hiddenAt(connector: Connector, workspace: string): string[] {
  const entries = Object.entries(connector.hidden ?? {});
  const found = entries.find(([scope]) =>
    workspace ? scope !== '' && samePath(scope, workspace) : scope === '',
  );
  return found?.[1] ?? [];
}

type Props = {
  connector: Connector;
  workspaces: WorkspaceChoice[];
};

export function ConnectorToolsPanel({ connector, workspaces }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fixed = connector.scope === 'workspace' ? (connector.workspace ?? '') : null;
  const [picked, setPicked] = useState('');
  const scope = fixed ?? picked;
  const hidden = hiddenAt(connector, scope);
  const save = useMutation<unknown, Error, string[]>({
    mutationFn: next => api.setHiddenTools(connector.name, next, scope || undefined),
    onSuccess: () => refreshConnectors(queryClient),
  });

  if (connector.tools.length === 0) return null;

  const toggle = (tool: string, visible: boolean) => {
    const next = visible ? hidden.filter(n => n !== tool) : [...hidden, tool];
    save.mutate(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <P className="text-sm font-medium">
          {t('connectors.tools.title', { count: connector.tools.length })}
        </P>
        {fixed === null && workspaces.length > 0 && (
          <Select
            value={picked}
            onChange={e => setPicked(e.target.value)}
            aria-label={t('connectors.tools.scope')}
            options={[
              { value: '', label: t('connectors.scope.everywhere') },
              ...workspaces.map(w => ({
                value: w.path,
                label: t('connectors.scope.workspace_named', { name: w.name }),
              })),
            ]}
            className="w-auto"
          />
        )}
      </div>
      <P variant="muted" className="text-xs">
        {t(
          fixed === null && !scope
            ? 'connectors.tools.hint_everywhere'
            : 'connectors.tools.hint_workspace',
        )}
      </P>
      {save.error && (
        <InlineNotice variant="error" role="alert">
          {save.error.message}
        </InlineNotice>
      )}
      <SettingsGroup>
        {connector.tools.map(tool => {
          const visible = !hidden.includes(tool.name);
          return (
            <SettingsRow
              key={tool.name}
              title={<span className="font-mono text-xs">{tool.name}</span>}
              description={tool.description}
              trailing={
                <Switch
                  checked={visible}
                  disabled={save.isPending}
                  aria-label={t('connectors.tools.visible', { name: tool.name })}
                  onChange={e => toggle(tool.name, e.target.checked)}
                />
              }
            />
          );
        })}
      </SettingsGroup>
    </div>
  );
}
