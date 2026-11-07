import { Button, FormField, InlineNotice, Input, P, Select, Spinner } from '@contenox/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getToolsPolicy, saveToolsPolicy, type ToolsPolicyItem } from '../../lib/agentsConfig';
import { agentsConfigKeys } from '../../lib/queryKeys';
import { policyKeysFor, policyLabelKey, validPolicyValue } from '../../lib/toolPolicies';
import type { WorkspaceChoice } from './ConnectorForm';

type Props = {
  toolset: string;
  workspaces: WorkspaceChoice[];
};

export function ToolRulesPanel({ toolset, workspaces }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState('');
  const scope = { workspace: workspace || undefined };
  const key = [...agentsConfigKeys.all, 'tools_policies', toolset, workspace] as const;
  const policy = useQuery<ToolsPolicyItem, Error>({
    queryKey: key,
    queryFn: () => getToolsPolicy(scope, toolset),
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<string[]>([]);

  useEffect(() => {
    setValues({ ...(policy.data?.layer ?? {}) });
    setInvalid([]);
  }, [policy.data]);

  const save = useMutation<void, Error, Record<string, string>>({
    mutationFn: next =>
      saveToolsPolicy(scope, toolset, next, {
        inLayer: policy.data?.inLayer ?? false,
        revision: policy.data?.revision ?? '',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...agentsConfigKeys.all, 'tools_policies', toolset],
      }),
  });

  const keys = policyKeysFor(toolset);
  const known = new Set(keys.map(k => k.key));
  const extra = Object.keys(values).filter(k => !known.has(k));

  const submit = () => {
    const bad = keys.filter(k => !validPolicyValue(k.kind, values[k.key] ?? '')).map(k => k.key);
    setInvalid(bad);
    if (bad.length > 0) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v.trim() !== '') next[k] = v.trim();
    }
    save.mutate(next);
  };

  const effective = policy.data?.effective ?? {};
  const where = workspace
    ? t('connectors.scope.workspace_named', {
        name: workspaces.find(w => w.path === workspace)?.name ?? workspace,
      })
    : t('connectors.scope.everywhere');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <P className="text-sm font-medium">{t('connectors.rules.title')}</P>
        {workspaces.length > 0 && (
          <Select
            value={workspace}
            onChange={e => setWorkspace(e.target.value)}
            aria-label={t('connectors.rules.scope')}
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
        {t('connectors.rules.hint')}
      </P>
      {policy.isLoading && (
        <div className="flex justify-center py-3" role="status">
          <Spinner />
        </div>
      )}
      {policy.error && (
        <InlineNotice variant="error" role="alert">
          {policy.error.message}
        </InlineNotice>
      )}
      {policy.data && (
        <>
          {[...keys.map(k => k.key), ...extra].map(k => {
            const kind = keys.find(x => x.key === k)?.kind;
            const inherited = effective[k];
            return (
              <FormField
                key={k}
                label={<span className="font-mono text-xs">{k}</span>}
                description={known.has(k) ? t(policyLabelKey(k) as never) : undefined}
                error={
                  invalid.includes(k)
                    ? t(
                        kind === 'bool'
                          ? 'connectors.rules.bool_invalid'
                          : 'connectors.rules.number_invalid',
                      )
                    : undefined
                }>
                <Input
                  value={values[k] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))}
                  placeholder={inherited ?? ''}
                  spellCheck={false}
                  mono
                  error={invalid.includes(k)}
                />
              </FormField>
            );
          })}
          {save.error && (
            <InlineNotice variant="error" role="alert">
              {save.error.message}
            </InlineNotice>
          )}
          {save.isSuccess && !save.isPending && (
            <P variant="muted" className="text-xs">
              {t('connectors.rules.saved', { where })}
            </P>
          )}
          <div className="flex justify-end gap-2">
            {policy.data.inLayer && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={save.isPending}
                onClick={() => save.mutate({})}>
                {t('connectors.rules.clear', { where })}
              </Button>
            )}
            <Button type="button" size="sm" isLoading={save.isPending} onClick={submit}>
              {t('connectors.rules.save', { where })}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
