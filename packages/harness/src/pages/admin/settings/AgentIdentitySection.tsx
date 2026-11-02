import {
  Button,
  CodeBlock,
  CopyRow,
  FormField,
  H2,
  InlineNotice,
  Input,
  P,
  Panel,
  Select,
  StatusIndicator,
  Switch,
} from '@contenox/ui';
import { FormEvent, useContext, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAgentIdentity,
  useCheckAgentIdentity,
  useGenerateAgentKey,
  useSaveAgentIdentity,
} from '../../../hooks/useAgentIdentity';
import {
  agentIdentityIssues,
  commitPreview,
  EMPTY_AGENT_IDENTITY,
  hasGeneratedAgentKey,
} from '../../../lib/agentIdentity';
import { AuthContext } from '../../../lib/authContext';
import type { AgentIdentity, AgentKey } from '../../../lib/types';

const CHECK_HOST = 'github.com';

function SwitchRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-0.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <P variant="muted" className="text-xs">
          {description}
        </P>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
    </div>
  );
}

export function AgentIdentitySection() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const { data: state, error: loadError } = useAgentIdentity(!!user);
  const save = useSaveAgentIdentity();
  const generate = useGenerateAgentKey();
  const check = useCheckAgentIdentity();
  const formId = useId();

  const [draft, setDraft] = useState<AgentIdentity>(() => state?.identity ?? EMPTY_AGENT_IDENTITY);
  const [loaded, setLoaded] = useState(!!state);
  const [checkHost, setCheckHost] = useState(CHECK_HOST);

  useEffect(() => {
    if (!state || loaded) return;
    setDraft(state.identity);
    setLoaded(true);
  }, [state, loaded]);

  const { isSuccess: saved, reset: resetSave } = save;
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => resetSave(), 3000);
    return () => window.clearTimeout(timer);
  }, [saved, resetSave]);

  const keys = useMemo<AgentKey[]>(() => state?.keys ?? [], [state]);
  const selectedKey = keys.find(key => key.ref === draft.key);
  const issues = agentIdentityIssues(draft, keys);
  const preview = commitPreview(draft, state?.me, selectedKey);
  const update = (patch: Partial<AgentIdentity>) => {
    check.reset();
    setDraft(current => ({ ...current, ...patch }));
  };

  const keyOptions = useMemo(() => {
    const options = [{ value: '', label: t('settings.agent_identity_key_none') }];
    for (const key of keys) {
      const suffix = key.usable ? '' : ` — ${t(`settings.agent_identity_key_problem_${key.problem ?? 'unreadable'}`)}`;
      options.push({ value: key.ref, label: `${key.label} · ${key.type}${suffix}` });
    }
    if (draft.key && !keys.some(key => key.ref === draft.key)) {
      options.push({ value: draft.key, label: t('settings.agent_identity_key_missing', { ref: draft.key }) });
    }
    return options;
  }, [draft.key, keys, t]);

  const onGenerate = () => {
    generate.reset();
    const comment = draft.email.trim() || 'contenox-agent';
    generate.mutate(comment, { onSuccess: key => update({ key: key.ref, sign: true }) });
  };

  const onCheck = () => {
    check.mutate({ key: draft.key, host: checkHost.trim() || CHECK_HOST });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.reset();
    save.mutate(
      {
        ...draft,
        name: draft.name.trim(),
        email: draft.email.trim(),
        creditAs: draft.creditAs.trim(),
        sign: draft.sign && !!draft.key,
      },
      { onSuccess: savedState => setDraft(savedState.identity) },
    );
  };

  const issueMessage = issues[0] ? t(`settings.agent_identity_issue_${issues[0]}`) : '';

  return (
    <Panel variant="surface">
      <div className="space-y-4">
        <div className="space-y-1">
          <H2>{t('settings.agent_identity_title')}</H2>
          <P variant="muted" className="text-sm">
            {t('settings.agent_identity_description')}
          </P>
        </div>

        {loadError && (
          <InlineNotice variant="error" className="rounded-lg">
            {t('settings.agent_identity_load_error', { message: loadError.message })}
          </InlineNotice>
        )}

        <form id={formId} onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('settings.agent_identity_name_label')}>
              <Input
                name="agent-git-name"
                value={draft.name}
                placeholder={t('settings.agent_identity_name_placeholder')}
                autoComplete="off"
                onChange={e => update({ name: e.target.value })}
              />
            </FormField>
            <FormField
              label={t('settings.agent_identity_email_label')}
              tooltip={t('settings.agent_identity_email_tooltip')}>
              <Input
                name="agent-git-email"
                type="email"
                value={draft.email}
                placeholder={t('settings.agent_identity_email_placeholder')}
                autoComplete="off"
                onChange={e => update({ email: e.target.value })}
              />
            </FormField>
          </div>

          <FormField
            label={t('settings.agent_identity_key_label')}
            tooltip={t('settings.agent_identity_key_tooltip')}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                name="agent-git-key"
                className="w-full"
                value={draft.key}
                onChange={e => {
                  const next = e.target.value;
                  update({ key: next, sign: next ? (draft.key ? draft.sign : true) : false });
                }}
                options={keyOptions}
              />
              {!hasGeneratedAgentKey(keys) && (
                <Button
                  type="button"
                  variant="outline"
                  palette="neutral"
                  size="sm"
                  className="shrink-0"
                  isLoading={generate.isPending}
                  disabled={generate.isPending || !state}
                  onClick={onGenerate}>
                  {t('settings.agent_identity_generate')}
                </Button>
              )}
            </div>
            {keys.length === 0 && state && (
              <P variant="muted" className="mt-1 text-xs">
                {t('settings.agent_identity_no_keys')}
              </P>
            )}
            {generate.isError && <P className="text-error mt-1 text-xs">{generate.error.message}</P>}
          </FormField>

          {selectedKey && (
            <div className="border-line space-y-3 rounded-lg border p-3">
              <CopyRow
                label={t('settings.agent_identity_public_key_label')}
                copyLabel={t('settings.agent_identity_copy')}
                copiedLabel={t('settings.agent_identity_copied')}
                value={selectedKey.publicKey}
              />
              <P variant="muted" className="text-xs">
                {t('settings.agent_identity_public_key_hint')}
              </P>
              {!selectedKey.usable && (
                <InlineNotice variant="warning" className="rounded-lg">
                  {t(`settings.agent_identity_key_fix_${selectedKey.problem ?? 'unreadable'}`)}
                </InlineNotice>
              )}
            </div>
          )}

          <div className="space-y-3">
            <SwitchRow
              label={t('settings.agent_identity_sign_label')}
              description={
                draft.key ? t('settings.agent_identity_sign_description') : t('settings.agent_identity_sign_needs_key')
              }
              checked={draft.sign && !!draft.key}
              disabled={!draft.key}
              onChange={sign => update({ sign })}
            />
            <SwitchRow
              label={t('settings.agent_identity_credit_label')}
              description={
                state?.me
                  ? t('settings.agent_identity_credit_description', { me: `${state.me.name} <${state.me.email}>` })
                  : t('settings.agent_identity_credit_no_me')
              }
              checked={draft.creditMe}
              onChange={creditMe => update({ creditMe })}
            />
            {draft.creditMe && (
              <FormField
                label={t('settings.agent_identity_credit_as_label')}
                tooltip={t('settings.agent_identity_credit_as_tooltip')}>
                <Input
                  name="agent-git-credit-as"
                  value={draft.creditAs}
                  placeholder={
                    state?.me
                      ? `${state.me.name} <${state.me.email}>`
                      : t('settings.agent_identity_credit_as_placeholder')
                  }
                  autoComplete="off"
                  onChange={e => update({ creditAs: e.target.value })}
                />
              </FormField>
            )}
          </div>

          <div className="space-y-2">
            <P className="text-sm font-medium">{t('settings.agent_identity_preview_title')}</P>
            {preview ? (
              <CodeBlock className="border-line bg-sidebar rounded-lg border px-3 py-2 text-xs whitespace-pre-wrap break-all">
                {[
                  `${t('settings.agent_identity_preview_author')}: ${preview.author}`,
                  preview.signedBy
                    ? `${t('settings.agent_identity_preview_signed')} ${preview.signedBy}`
                    : t('settings.agent_identity_preview_unsigned'),
                  '',
                  t('settings.agent_identity_preview_message'),
                  ...(preview.coAuthor ? ['', `Co-authored-by: ${preview.coAuthor}`] : []),
                ].join('\n')}
              </CodeBlock>
            ) : (
              <P variant="muted" className="text-xs">
                {t('settings.agent_identity_preview_none')}
              </P>
            )}
          </div>

          {draft.key && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  palette="neutral"
                  size="sm"
                  isLoading={check.isPending}
                  disabled={check.isPending || !selectedKey?.usable}
                  onClick={onCheck}>
                  {t('settings.agent_identity_check')}
                </Button>
                <Input
                  name="agent-git-check-host"
                  aria-label={t('settings.agent_identity_check_host_label')}
                  className="w-44"
                  value={checkHost}
                  onChange={e => {
                    check.reset();
                    setCheckHost(e.target.value);
                  }}
                />
                <P variant="muted" className="text-xs">
                  {t('settings.agent_identity_check_hint', { host: checkHost.trim() || CHECK_HOST })}
                </P>
              </div>
              {check.isError && <P className="text-error text-xs">{check.error.message}</P>}
              {check.data && (
                <div className="space-y-1">
                  <StatusIndicator
                    size="sm"
                    status={check.data.signing.ok ? 'completed' : 'error'}
                    label={
                      check.data.signing.ok
                        ? t('settings.agent_identity_check_signing_ok')
                        : t('settings.agent_identity_check_signing_failed', { message: check.data.signing.message })
                    }
                  />
                  {check.data.host && (
                    <StatusIndicator
                      size="sm"
                      status={check.data.host.ok ? 'completed' : 'error'}
                      label={
                        check.data.host.ok
                          ? check.data.host.account
                            ? t('settings.agent_identity_check_host_ok_account', {
                                host: check.data.host.host,
                                account: check.data.host.account,
                              })
                            : t('settings.agent_identity_check_host_ok', { host: check.data.host.host })
                          : check.data.host.reason && check.data.host.reason !== 'failed'
                            ? t(`settings.agent_identity_check_host_${check.data.host.reason}`, { host: check.data.host.host })
                            : t('settings.agent_identity_check_host_failed', {
                                host: check.data.host.host,
                                message: check.data.host.message,
                              })
                      }
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {issueMessage && <P className="text-warning text-sm">{issueMessage}</P>}
          {save.isError && <P className="text-error text-sm">{save.error.message}</P>}
          {save.isSuccess && <P className="text-text-muted text-sm">{t('settings.saved')}</P>}

          <div>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              size="sm"
              disabled={save.isPending || !state || issues.length > 0}>
              {t('settings.save')}
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  );
}
