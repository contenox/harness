import { Badge, InlineNotice, P, Select, SettingsGroup, SettingsRow, Spinner } from '@contenox/ui';
import { Wrench } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalToolsets } from '../../../../hooks/usePermissions';
import type { ConfigScope } from '../../../../lib/agentsConfig';
import {
  AREA_TOOLSETS,
  GRANTS,
  displayName,
  layerHas,
  resolveTools,
  type Grant,
  type RawEnvelopes,
} from '../../../../lib/permissions';
import { CHOICE_LABEL, GRANT_LABEL, type SaveHandler } from './AxisRow';

type Props = {
  scope: ConfigScope;
  name: string;
  envelopes: RawEnvelopes;
  layer: unknown;
  workspaceName: string | undefined;
  onSave: SaveHandler;
};

type ToolRowModel = { pattern: string; description?: string; unavailable?: string };

export function ToolsGroup({ scope, name, envelopes, layer, workspaceName, onSave }: Props) {
  const { t } = useTranslation();
  const toolsets = useLocalToolsets(scope);
  const resolved = resolveTools(envelopes, name);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = new Map<string, ToolRowModel>();
  for (const pattern of resolved.keys()) rows.set(pattern, { pattern });
  for (const set of toolsets.data ?? []) {
    if (AREA_TOOLSETS.has(set.name) && !rows.has(set.name)) continue;
    rows.set(set.name, {
      pattern: set.name,
      description: set.description,
      unavailable: set.unavailableReason,
    });
  }
  const ordered = [...rows.values()].sort((a, b) =>
    a.pattern === '*' ? -1 : b.pattern === '*' ? 1 : a.pattern.localeCompare(b.pattern),
  );

  const change = async (pattern: string, value: string) => {
    setBusy(pattern);
    setError(null);
    try {
      await onSave({ tools: { [pattern]: value === '' ? null : value } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const row = ({ pattern, description, unavailable }: ToolRowModel) => {
    const current = resolved.get(pattern);
    const own = current && current.from === name ? current.value : '';
    const changedHere = workspaceName !== undefined && layerHas(layer, ['tools', pattern]);
    const parent = current && current.from !== name ? current : undefined;
    const emptyLabel = changedHere
      ? t('permissions.reset_here')
      : parent
        ? `${t('permissions.tools_same_as', { name: displayName(parent.from) })} (${t(GRANT_LABEL[parent.value])})`
        : t('permissions.tools_follow');
    const detail = unavailable
      ? t('permissions.tools_unavailable', { reason: unavailable })
      : description || (current ? undefined : t('permissions.tools_found'));
    return (
      <SettingsRow
        key={pattern}
        icon={<Wrench />}
        title={pattern === '*' ? t('permissions.tools_all') : pattern}
        description={detail}
        trailing={
          <>
            {changedHere && (
              <Badge size="sm" variant="accent">
                {t('permissions.changed_here')}
              </Badge>
            )}
            {busy === pattern && <Spinner size="sm" />}
            <Select
              aria-label={pattern}
              className="w-44"
              value={own}
              disabled={busy !== null}
              options={[
                { value: '', label: emptyLabel },
                ...GRANTS.map((g: Grant) => ({ value: g, label: t(CHOICE_LABEL[g]) })),
              ]}
              onChange={e => void change(pattern, e.target.value)}
            />
          </>
        }
      />
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <SettingsGroup title={t('permissions.group_tools')}>
        {ordered.map(row)}
        {toolsets.isLoading && (
          <div className="flex justify-center py-3">
            <Spinner />
          </div>
        )}
      </SettingsGroup>
      {!toolsets.isLoading && ordered.length === 0 && (
        <P variant="muted" className="px-1 text-xs">
          {t('permissions.tools_empty')}
        </P>
      )}
      {toolsets.error && (
        <InlineNotice variant="warning">{t('permissions.tools_error', { message: toolsets.error.message })}</InlineNotice>
      )}
      {error && (
        <InlineNotice variant="error" role="alert">
          {error}
        </InlineNotice>
      )}
    </div>
  );
}
