import { Badge, Button, FormField, InlineNotice, Select, SettingsRow } from '@contenox/ui';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AXIS_LISTS,
  AXIS_PATH,
  GRANTS,
  axisPatch,
  displayName,
  layerHas,
  nestAt,
  resolveAxis,
  resolveDefaultAction,
  sameValue,
  type AxisId,
  type AxisValue,
  type Grant,
  type ListKey,
  type RawEnvelopes,
  type Substitution,
} from '../../../../lib/permissions';
import { ListEditor } from './ListEditor';

export type SaveHandler = (patch: Record<string, unknown>) => Promise<unknown>;

type Props = {
  axis: AxisId;
  icon: ReactNode;
  name: string;
  envelopes: RawEnvelopes;
  layer: unknown;
  workspaceName: string | undefined;
  revision: string;
  onSave: SaveHandler;
};

const AXIS_TITLE = {
  'files.read': 'permissions.axis_files_read',
  'files.write': 'permissions.axis_files_write',
  shell: 'permissions.axis_shell',
  'missions.fire': 'permissions.axis_missions_fire',
  'missions.answer': 'permissions.axis_missions_answer',
} as const;

const AXIS_WHEN = {
  'files.read': 'permissions.when_files_read',
  'files.write': 'permissions.when_files_write',
  shell: 'permissions.when_shell',
  'missions.fire': 'permissions.when_missions_fire',
  'missions.answer': 'permissions.when_missions_answer',
} as const;

export const CHOICE_LABEL = {
  allow: 'permissions.choice_allow',
  approve: 'permissions.choice_approve',
  deny: 'permissions.choice_deny',
} as const;

export const GRANT_LABEL = {
  allow: 'permissions.grant_allow',
  approve: 'permissions.grant_approve',
  deny: 'permissions.grant_deny',
} as const;

const LIST_LABEL = {
  approve_paths: 'permissions.list_approve_paths',
  deny_paths: 'permissions.list_deny_paths',
  prefix_allowlist: 'permissions.list_prefix_allowlist',
  ask_always: 'permissions.list_ask_always',
  blacklist: 'permissions.list_blacklist',
} as const;

const LIST_PLACEHOLDER = {
  approve_paths: 'permissions.placeholder_paths',
  deny_paths: 'permissions.placeholder_paths',
  prefix_allowlist: 'permissions.placeholder_prefix',
  ask_always: 'permissions.placeholder_program',
  blacklist: 'permissions.placeholder_program',
} as const;

const SUBSTITUTIONS: Substitution[] = ['approve', 'deny', 'off'];

const SUBSTITUTION_LABEL = {
  approve: 'permissions.substitution_approve',
  deny: 'permissions.substitution_deny',
  off: 'permissions.substitution_off',
} as const;

function useSummary(axis: AxisId, value: AxisValue | undefined): string | undefined {
  const { t } = useTranslation();
  if (!value) return undefined;
  const preview = (items: string[]) => {
    const shown = items.slice(0, 3).join(', ');
    return items.length > 3 ? t('permissions.summary_more', { items: shown, count: items.length - 3 }) : shown;
  };
  const parts: string[] = [];
  if (axis === 'files.read' || axis === 'files.write') {
    const ask = value.lists.approve_paths ?? [];
    const never = value.lists.deny_paths ?? [];
    if (ask.length > 0) parts.push(t('permissions.summary_ask_for', { items: preview(ask) }));
    if (never.length > 0) parts.push(t('permissions.summary_never', { items: preview(never) }));
  } else if (axis === 'shell') {
    const free = value.lists.prefix_allowlist?.length ?? 0;
    const ask = value.lists.ask_always?.length ?? 0;
    const never = value.lists.blacklist?.length ?? 0;
    if (free > 0) parts.push(t('permissions.summary_run_free', { count: free }));
    if (ask > 0) parts.push(t('permissions.summary_ask_before', { count: ask }));
    if (never > 0) parts.push(t('permissions.summary_never_run', { count: never }));
  } else {
    return undefined;
  }
  return parts.length > 0 ? parts.join(' · ') : t('permissions.summary_none');
}

export function AxisRow({ axis, icon, name, envelopes, layer, workspaceName, revision, onSave }: Props) {
  const { t } = useTranslation();
  const resolved = resolveAxis(envelopes, name, axis);
  const fallback = resolveDefaultAction(envelopes, name);
  const changedHere = workspaceName !== undefined && layerHas(layer, AXIS_PATH[axis]);
  const summary = useSummary(axis, resolved?.value);
  const grant = resolved?.value.grant ?? fallback;

  const origin = changedHere ? (
    <Badge size="sm" variant="accent">
      {t('permissions.changed_here')}
    </Badge>
  ) : resolved && resolved.from !== name ? (
    <span>{t('permissions.from_set', { name: displayName(resolved.from) })}</span>
  ) : !resolved ? (
    <span>{t('permissions.not_set', { grant: t(GRANT_LABEL[fallback]) })}</span>
  ) : null;

  return (
    <SettingsRow
      icon={icon}
      title={t(AXIS_TITLE[axis])}
      description={summary}
      trailing={
        <>
          {origin}
          <span className="font-medium text-text">{t(GRANT_LABEL[grant])}</span>
        </>
      }>
      <AxisEditor
        key={revision}
        axis={axis}
        initial={resolved?.value ?? { grant, lists: {}, extra: {} }}
        previous={resolved?.value}
        changedHere={changedHere}
        onSave={onSave}
      />
    </SettingsRow>
  );
}

type EditorProps = {
  axis: AxisId;
  initial: AxisValue;
  previous: AxisValue | undefined;
  changedHere: boolean;
  onSave: SaveHandler;
};

function AxisEditor({ axis, initial, previous, changedHere, onSave }: EditorProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<AxisValue>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = !sameValue(draft, initial);

  const run = async (patch: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await onSave(patch);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const setList = (key: ListKey, values: string[]) =>
    setDraft(prev => ({ ...prev, lists: { ...prev.lists, [key]: values } }));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        void run(axisPatch(axis, draft, previous));
      }}>
      <FormField label={t(AXIS_WHEN[axis])}>
        <Select
          className="w-48"
          value={draft.grant}
          options={GRANTS.map(g => ({ value: g, label: t(CHOICE_LABEL[g]) }))}
          onChange={e => setDraft(prev => ({ ...prev, grant: e.target.value as Grant }))}
        />
      </FormField>
      {AXIS_LISTS[axis].map(key => (
        <ListEditor
          key={key}
          label={t(LIST_LABEL[key])}
          placeholder={t(LIST_PLACEHOLDER[key])}
          values={draft.lists[key] ?? []}
          onChange={values => setList(key, values)}
        />
      ))}
      {axis === 'shell' && (
        <FormField label={t('permissions.substitution_label')}>
          <Select
            className="w-64"
            value={draft.substitution ?? 'off'}
            options={SUBSTITUTIONS.map(s => ({ value: s, label: t(SUBSTITUTION_LABEL[s]) }))}
            onChange={e => setDraft(prev => ({ ...prev, substitution: e.target.value as Substitution }))}
          />
        </FormField>
      )}
      {error && (
        <InlineNotice variant="error" role="alert">
          {error}
        </InlineNotice>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="sm" isLoading={busy} disabled={!dirty || busy}>
          {busy ? t('permissions.saving') : t('permissions.save')}
        </Button>
        {dirty && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(initial)}>
            {t('permissions.discard')}
          </Button>
        )}
        {changedHere && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void run(nestAt(AXIS_PATH[axis], null))}>
            {t('permissions.reset_here')}
          </Button>
        )}
      </div>
    </form>
  );
}
