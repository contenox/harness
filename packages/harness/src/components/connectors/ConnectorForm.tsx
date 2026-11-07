import {
  Button,
  Checkbox,
  Disclosure,
  FormField,
  InlineNotice,
  Input,
  RadioCardGroup,
  SecretInput,
  Select,
  Textarea,
} from '@contenox/ui';
import { FolderOpen } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  emptyConnectorForm,
  validateConnectorForm,
  type ConnectorFormErrors,
  type ConnectorFormKind,
  type ConnectorFormValues,
} from '../../lib/connectorForm';

export type WorkspaceChoice = { path: string; name: string };

type Props = {
  initial?: ConnectorFormValues;
  editing?: boolean;
  forChat?: boolean;
  takenNames: string[];
  workspaces?: WorkspaceChoice[];
  pending: boolean;
  error?: string;
  onSave: (values: ConnectorFormValues) => void;
  onCancel?: () => void;
};

export function ConnectorForm({
  initial,
  editing = false,
  forChat = false,
  takenNames,
  workspaces = [],
  pending,
  error,
  onSave,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState<ConnectorFormValues>(initial ?? emptyConnectorForm);
  const [errors, setErrors] = useState<ConnectorFormErrors>({});
  const picker = typeof window !== 'undefined' ? window.contenoxDesktop : undefined;

  const set = <K extends keyof ConnectorFormValues>(key: K, value: ConnectorFormValues[K]) => {
    setValues(v => ({ ...v, [key]: value }));
    setErrors(e => ({ ...e, [key as keyof ConnectorFormErrors]: undefined }));
  };

  const err = (key: keyof ConnectorFormErrors) =>
    errors[key] ? t(errors[key] as never) : undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateConnectorForm(values, takenNames, editing);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave(values);
  };

  const kinds: { value: ConnectorFormKind; label: string; description: string }[] = [
    {
      value: 'command',
      label: t('connectors.form.kind_command'),
      description: t('connectors.form.kind_command_hint'),
    },
    {
      value: 'remote',
      label: t('connectors.form.kind_remote'),
      description: t('connectors.form.kind_remote_hint'),
    },
  ];
  if (!forChat) {
    kinds.push({
      value: 'openapi',
      label: t('connectors.form.kind_openapi'),
      description: t('connectors.form.kind_openapi_hint'),
    });
  }

  const scopeOptions = [
    { value: '', label: t('connectors.scope.everywhere') },
    ...workspaces.map(w => ({
      value: w.path,
      label: t('connectors.scope.workspace_named', { name: w.name }),
    })),
  ];
  if (values.workspace && !workspaces.some(w => w.path === values.workspace)) {
    scopeOptions.push({ value: values.workspace, label: values.workspace });
  }

  const chooseFolder = async () => {
    if (!picker) return;
    const selected = await picker.selectDirectory();
    if (selected) set('workspace', selected);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      {!editing && (
        <FormField label={t('connectors.form.kind')}>
          <RadioCardGroup
            aria-label={t('connectors.form.kind')}
            options={kinds}
            value={values.kind}
            onChange={kind => set('kind', kind)}
          />
        </FormField>
      )}

      {!editing && (
        <FormField
          label={t('connectors.form.name')}
          required
          error={err('name')}
          description={t('connectors.form.name_hint')}>
          <Input
            value={values.name}
            onChange={e => set('name', e.target.value.toLowerCase())}
            placeholder={values.kind === 'openapi' ? 'billing-api' : 'github'}
            autoComplete="off"
            spellCheck={false}
            error={!!errors.name}
          />
        </FormField>
      )}

      {!forChat && (
        <FormField label={t('connectors.form.scope')} description={t('connectors.form.scope_hint')}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={values.workspace}
              onChange={e => set('workspace', e.target.value)}
              options={scopeOptions}
              className="sm:flex-1"
            />
            {picker && (
              <Button type="button" variant="outline" size="sm" onClick={chooseFolder}>
                <FolderOpen className="size-3.5" aria-hidden />
                {t('connectors.form.choose_folder')}
              </Button>
            )}
          </div>
        </FormField>
      )}

      {values.kind === 'command' && (
        <>
          <FormField
            label={t('connectors.form.command')}
            required
            error={err('command')}
            description={t('connectors.form.command_hint')}>
            <Input
              value={values.command}
              onChange={e => set('command', e.target.value)}
              placeholder="npx"
              autoComplete="off"
              spellCheck={false}
              mono
              error={!!errors.command}
            />
          </FormField>
          <FormField label={t('connectors.form.args')} description={t('connectors.form.args_hint')}>
            <Textarea
              value={values.args}
              onChange={e => set('args', e.target.value)}
              rows={3}
              placeholder={'-y\n@modelcontextprotocol/server-github'}
              spellCheck={false}
              className="font-mono"
            />
          </FormField>
          <FormField
            label={t('connectors.form.env')}
            error={err('env')}
            description={t('connectors.form.env_hint')}>
            <Textarea
              value={values.env}
              onChange={e => set('env', e.target.value)}
              rows={2}
              placeholder="GITHUB_PERSONAL_ACCESS_TOKEN=ghp_..."
              spellCheck={false}
              className="font-mono"
            />
          </FormField>
        </>
      )}

      {values.kind !== 'command' && (
        <FormField
          label={t(values.kind === 'openapi' ? 'connectors.form.endpoint' : 'connectors.form.url')}
          required
          error={err('url')}
          description={t(
            values.kind === 'openapi'
              ? 'connectors.form.endpoint_hint'
              : 'connectors.form.url_hint',
          )}>
          <Input
            value={values.url}
            onChange={e => set('url', e.target.value)}
            placeholder={
              values.kind === 'openapi' ? 'https://api.example.com' : 'https://mcp.example.com/mcp'
            }
            autoComplete="off"
            spellCheck={false}
            mono
            error={!!errors.url}
          />
        </FormField>
      )}

      {values.kind === 'remote' && (
        <>
          <FormField
            label={t('connectors.form.transport')}
            description={t('connectors.form.transport_hint')}>
            <Select
              value={values.transport}
              onChange={e => set('transport', e.target.value as ConnectorFormValues['transport'])}
              options={[
                { value: 'http', label: t('connectors.form.transport_http') },
                { value: 'sse', label: t('connectors.form.transport_sse') },
              ]}
            />
          </FormField>
          <FormField label={t('connectors.form.auth')}>
            <Select
              value={values.auth}
              onChange={e => set('auth', e.target.value as ConnectorFormValues['auth'])}
              options={[
                { value: 'none', label: t('connectors.form.auth_none') },
                { value: 'bearer', label: t('connectors.form.auth_bearer') },
                ...(forChat ? [] : [{ value: 'oauth', label: t('connectors.form.auth_oauth') }]),
              ]}
            />
          </FormField>
          {values.auth === 'bearer' && (
            <>
              <FormField
                label={t('connectors.form.token')}
                error={err('token')}
                description={t('connectors.form.token_hint')}>
                <SecretInput
                  value={values.token}
                  onChange={e => set('token', e.target.value)}
                  showLabel={t('connectors.form.show')}
                  hideLabel={t('connectors.form.hide')}
                  autoComplete="off"
                  error={!!errors.token}
                />
              </FormField>
              {!forChat && (
                <FormField
                  label={t('connectors.form.token_env')}
                  description={t('connectors.form.token_env_hint')}>
                  <Input
                    value={values.tokenEnv}
                    onChange={e => set('tokenEnv', e.target.value)}
                    placeholder="MCP_TOKEN"
                    autoComplete="off"
                    spellCheck={false}
                    mono
                  />
                </FormField>
              )}
            </>
          )}
          {values.auth === 'oauth' && (
            <FormField
              label={t('connectors.form.oauth_client')}
              description={t('connectors.form.oauth_client_hint')}>
              <Input
                value={values.oauthClientId}
                onChange={e => set('oauthClientId', e.target.value)}
                autoComplete="off"
                spellCheck={false}
                mono
              />
            </FormField>
          )}
        </>
      )}

      {values.kind === 'openapi' && (
        <>
          <FormField
            label={t('connectors.form.spec')}
            error={err('specUrl')}
            description={t('connectors.form.spec_hint')}>
            <Input
              value={values.specUrl}
              onChange={e => set('specUrl', e.target.value)}
              placeholder="https://api.example.com/openapi.json"
              autoComplete="off"
              spellCheck={false}
              mono
              error={!!errors.specUrl}
            />
          </FormField>
          <FormField label={t('connectors.form.timeout')} error={err('timeoutMs')}>
            <Input
              value={values.timeoutMs}
              onChange={e => set('timeoutMs', e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              error={!!errors.timeoutMs}
            />
          </FormField>
        </>
      )}

      {values.kind !== 'command' && (
        <FormField
          label={t('connectors.form.headers')}
          error={err('headers')}
          description={t('connectors.form.headers_hint')}>
          <Textarea
            value={values.headers}
            onChange={e => set('headers', e.target.value)}
            rows={2}
            placeholder="X-Api-Key: ..."
            spellCheck={false}
            className="font-mono"
          />
        </FormField>
      )}

      {!forChat && (
        <Disclosure label={t('connectors.form.advanced')}>
          <div className="flex flex-col gap-4 pt-2">
            <FormField
              label={t('connectors.form.inject')}
              error={err('inject')}
              description={t('connectors.form.inject_hint')}>
              <Textarea
                value={values.inject}
                onChange={e => set('inject', e.target.value)}
                rows={2}
                placeholder="tenant=acme"
                spellCheck={false}
                className="font-mono"
              />
            </FormField>
            {values.kind !== 'openapi' && (
              <FormField label={t('connectors.form.connect_timeout')} error={err('connectTimeout')}>
                <Input
                  value={values.connectTimeout}
                  onChange={e => set('connectTimeout', e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  error={!!errors.connectTimeout}
                />
              </FormField>
            )}
            {values.kind === 'remote' && values.auth === 'oauth' && (
              <FormField
                label={t('connectors.form.oauth_secret_env')}
                description={t('connectors.form.oauth_secret_env_hint')}>
                <Input
                  value={values.oauthSecretEnv}
                  onChange={e => set('oauthSecretEnv', e.target.value)}
                  placeholder="MCP_CLIENT_SECRET"
                  autoComplete="off"
                  spellCheck={false}
                  mono
                />
              </FormField>
            )}
            {values.kind === 'openapi' && (
              <>
                <FormField
                  label={t('connectors.form.prop')}
                  error={err('propName')}
                  description={t('connectors.form.prop_hint')}>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={values.propName}
                      onChange={e => set('propName', e.target.value)}
                      placeholder={t('connectors.form.prop_name')}
                      aria-label={t('connectors.form.prop_name')}
                      spellCheck={false}
                      mono
                      className="sm:flex-1"
                      error={!!errors.propName}
                    />
                    <Input
                      value={values.propValue}
                      onChange={e => set('propValue', e.target.value)}
                      placeholder={t('connectors.form.prop_value')}
                      aria-label={t('connectors.form.prop_value')}
                      spellCheck={false}
                      mono
                      className="sm:flex-1"
                    />
                    <Select
                      value={values.propIn}
                      onChange={e => set('propIn', e.target.value as ConnectorFormValues['propIn'])}
                      aria-label={t('connectors.form.prop_in')}
                      options={[
                        { value: 'body', label: t('connectors.form.in_body') },
                        { value: 'query', label: t('connectors.form.in_query') },
                        { value: 'path', label: t('connectors.form.in_path') },
                        { value: 'header', label: t('connectors.form.in_header') },
                      ]}
                      className="sm:w-36"
                    />
                  </div>
                </FormField>
                <Checkbox
                  label={t('connectors.form.login')}
                  checked={values.login}
                  onChange={e => set('login', e.target.checked)}
                />
                {values.login && (
                  <div className="flex flex-col gap-4 pl-6">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Select
                        value={values.loginMethod}
                        onChange={e => set('loginMethod', e.target.value)}
                        aria-label={t('connectors.form.login_method')}
                        options={['POST', 'GET', 'PUT'].map(m => ({ value: m, label: m }))}
                        className="sm:w-28"
                      />
                      <Input
                        value={values.loginUrl}
                        onChange={e => set('loginUrl', e.target.value)}
                        placeholder="https://erp.example.com/api/login"
                        aria-label={t('connectors.form.login_url')}
                        spellCheck={false}
                        mono
                        className="sm:flex-1"
                        error={!!errors.loginUrl}
                      />
                    </div>
                    {errors.loginUrl && (
                      <InlineNotice variant="error">{t(errors.loginUrl as never)}</InlineNotice>
                    )}
                    <FormField
                      label={t('connectors.form.login_body')}
                      description={t('connectors.form.login_body_hint')}>
                      <Textarea
                        value={values.loginBody}
                        onChange={e => set('loginBody', e.target.value)}
                        rows={2}
                        placeholder={'{"user": "${API_USER}", "password": "${API_PASSWORD}"}'}
                        spellCheck={false}
                        className="font-mono"
                      />
                    </FormField>
                    <FormField
                      label={t('connectors.form.extract')}
                      error={err('extract')}
                      description={t('connectors.form.extract_hint')}>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={values.extractCookie}
                          onChange={e => set('extractCookie', e.target.value)}
                          placeholder={t('connectors.form.extract_cookie')}
                          aria-label={t('connectors.form.extract_cookie')}
                          spellCheck={false}
                          mono
                          className="sm:flex-1"
                        />
                        <Input
                          value={values.extractJsonPath}
                          onChange={e => set('extractJsonPath', e.target.value)}
                          placeholder="$.data.token"
                          aria-label={t('connectors.form.extract_json')}
                          spellCheck={false}
                          mono
                          className="sm:flex-1"
                        />
                      </div>
                    </FormField>
                    <FormField
                      label={t('connectors.form.login_inject')}
                      description={t('connectors.form.login_inject_hint')}>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={values.injectHeader}
                          onChange={e => set('injectHeader', e.target.value)}
                          placeholder="Authorization"
                          aria-label={t('connectors.form.login_inject_header')}
                          spellCheck={false}
                          mono
                          className="sm:flex-1"
                        />
                        <Input
                          value={values.injectFormat}
                          onChange={e => set('injectFormat', e.target.value)}
                          placeholder="Bearer %s"
                          aria-label={t('connectors.form.login_inject_format')}
                          spellCheck={false}
                          mono
                          className="sm:flex-1"
                        />
                      </div>
                    </FormField>
                  </div>
                )}
                <Checkbox
                  label={t('connectors.form.insecure')}
                  checked={values.insecureSkipVerify}
                  onChange={e => set('insecureSkipVerify', e.target.checked)}
                />
                {values.insecureSkipVerify && (
                  <InlineNotice variant="warning">
                    {t('connectors.form.insecure_warning')}
                  </InlineNotice>
                )}
              </>
            )}
          </div>
        </Disclosure>
      )}

      {error && (
        <InlineNotice variant="error" role="alert">
          {error}
        </InlineNotice>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onCancel}>
            {t('connectors.cancel')}
          </Button>
        )}
        <Button type="submit" size="sm" isLoading={pending}>
          {editing
            ? t('connectors.form.save')
            : forChat
              ? t('connectors.form.add_to_chat')
              : t('connectors.form.add')}
        </Button>
      </div>
    </form>
  );
}
