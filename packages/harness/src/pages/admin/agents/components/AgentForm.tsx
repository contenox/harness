import { Button, FormField, IconButton, InlineNotice, Input, Select, Textarea } from '@contenox/ui';
import { Plus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateExternalAgent, useUpdateExternalAgent } from '../../../../hooks/useExternalAgents';
import {
  emptyAgentForm,
  formFromAgent,
  inputFromForm,
  validateAgentForm,
  type AgentFormErrors,
  type AgentFormValues,
} from '../../../../lib/externalAgentForm';
import type { ExternalAgent, ExternalAgentPath } from '../../../../lib/types';

type Props = {
  agent?: ExternalAgent;
  takenNames: string[];
  onSaved: (agent: ExternalAgent) => void;
  onCancel?: () => void;
};

export function AgentForm({ agent, takenNames, onSaved, onCancel }: Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState<AgentFormValues>(() => (agent ? formFromAgent(agent) : emptyAgentForm));
  const [errors, setErrors] = useState<AgentFormErrors>({});
  const create = useCreateExternalAgent();
  const update = useUpdateExternalAgent(agent?.name ?? '');
  const save = agent ? update : create;

  const set = <K extends keyof AgentFormValues>(key: K, value: AgentFormValues[K]) => {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };
  const setPath = (i: number, patch: Partial<ExternalAgentPath>) =>
    set(
      'paths',
      values.paths.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateAgentForm(values, takenNames, !!agent);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    save.mutate(inputFromForm(values, agent?.enabled), { onSuccess: onSaved });
  };

  const err = (key: keyof AgentFormErrors) => (errors[key] ? t(errors[key] as never) : undefined);

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {!agent && (
        <FormField label={t('external_agents.form.name')} required error={err('name')} description={t('external_agents.form.name_hint')}>
          <Input
            value={values.name}
            onChange={e => set('name', e.target.value.toLowerCase())}
            placeholder="goose"
            autoComplete="off"
            spellCheck={false}
            error={!!errors.name}
          />
        </FormField>
      )}
      <FormField label={t('external_agents.form.command')} required error={err('command')} description={t('external_agents.form.command_hint')}>
        <Input
          value={values.command}
          onChange={e => set('command', e.target.value)}
          placeholder="goose"
          autoComplete="off"
          spellCheck={false}
          mono
          error={!!errors.command}
        />
      </FormField>
      <FormField label={t('external_agents.form.args')} description={t('external_agents.form.args_hint')}>
        <Textarea value={values.args} onChange={e => set('args', e.target.value)} rows={2} placeholder="acp" spellCheck={false} className="font-mono" />
      </FormField>
      <FormField label={t('external_agents.form.env')} error={err('env')} description={t('external_agents.form.env_hint')}>
        <Textarea value={values.env} onChange={e => set('env', e.target.value)} rows={2} placeholder="GOOSE_PROVIDER=anthropic" spellCheck={false} className="font-mono" />
      </FormField>

      <FormField label={t('external_agents.form.paths')} error={err('paths')} description={t('external_agents.form.paths_hint')}>
        <div className="flex flex-col gap-2">
          {values.paths.map((p, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={p.path}
                onChange={e => setPath(i, { path: e.target.value })}
                placeholder="~/.config/goose"
                aria-label={t('external_agents.form.path_label')}
                spellCheck={false}
                mono
                className="sm:flex-1"
              />
              <Select
                value={p.mode}
                onChange={e => setPath(i, { mode: e.target.value as ExternalAgentPath['mode'] })}
                aria-label={t('external_agents.form.path_mode')}
                options={[
                  { value: 'rw', label: t('external_agents.form.mode_rw') },
                  { value: 'ro', label: t('external_agents.form.mode_ro') },
                ]}
                className="sm:w-36"
              />
              <Input
                value={p.needs}
                onChange={e => setPath(i, { needs: e.target.value })}
                placeholder={t('external_agents.form.path_needs_placeholder')}
                aria-label={t('external_agents.form.path_needs')}
                className="sm:flex-1"
              />
              <IconButton
                label={t('external_agents.form.path_remove')}
                size="xs"
                onClick={() => set('paths', values.paths.filter((_, j) => j !== i))}>
                <X className="size-3.5" aria-hidden />
              </IconButton>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="text"
              size="sm"
              onClick={() => set('paths', [...values.paths, { path: '', mode: 'rw', needs: '' }])}>
              <Plus className="size-3.5" aria-hidden />
              {t('external_agents.form.path_add')}
            </Button>
          </div>
        </div>
      </FormField>

      <FormField label={t('external_agents.form.modes')} description={t('external_agents.form.modes_hint')}>
        <Input value={values.modes} onChange={e => set('modes', e.target.value)} placeholder="default, plan" spellCheck={false} />
      </FormField>

      {save.error && (
        <InlineNotice variant="error" role="alert">
          {save.error.message}
        </InlineNotice>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" disabled={save.isPending} onClick={onCancel}>
            {t('external_agents.cancel')}
          </Button>
        )}
        <Button type="submit" size="sm" isLoading={save.isPending}>
          {agent ? t('external_agents.form.save') : t('external_agents.form.add')}
        </Button>
      </div>
    </form>
  );
}
