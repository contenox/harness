import { Button, FormField, H2, Input, P, Panel } from '@contenox/ui';
import { FormEvent, useContext, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCLIConfig } from '../../../hooks/useCLIConfig';
import { usePutCLIConfig } from '../../../hooks/usePutCLIConfig';
import { useResetAfterSuccess } from '../../../hooks/useResetAfterSuccess';
import { AuthContext } from '../../../lib/authContext';
import type { CLIConfigUpdateRequest } from '../../../lib/types';
import { applyUiLanguage } from '../../../lib/uiLanguage';
import { isValidLocale, resolveLocaleOverride } from './settingsValidation';

export function LocaleSettingsSection() {
  const { t, i18n } = useTranslation();
  const { user } = useContext(AuthContext);
  const { data } = useCLIConfig(!!user);
  const putConfig = usePutCLIConfig();
  const formId = useId();

  const [locale, setLocale] = useState('');
  const [localeError, setLocaleError] = useState('');

  useEffect(() => {
    if (!data) return;
    setLocale(resolveLocaleOverride(data.locale, data.resolvedFrom?.locale));
  }, [data]);

  useResetAfterSuccess(putConfig.isSuccess, putConfig.reset);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    putConfig.reset();
    setLocaleError('');
    const trimmed = locale.trim();
    if (!isValidLocale(trimmed)) {
      setLocaleError(t('settings.locale_invalid'));
      return;
    }
    const body: CLIConfigUpdateRequest = { locale: trimmed };
    putConfig.mutate(body, {
      onSuccess: () => {
        void applyUiLanguage(
          i18n,
          trimmed,
          data?.detectedLocale ?? '',
          typeof window === 'undefined' ? null : window.localStorage,
          typeof navigator === 'undefined' ? '' : navigator.language,
        );
      },
    });
  };

  const detected = data?.detectedLocale ?? '';

  return (
    <Panel variant="surface">
      <div className="space-y-4">
        <div className="space-y-1">
          <H2>{t('settings.locale_section_title')}</H2>
          <P variant="muted" className="text-sm">
            {t('settings.locale_section_description')}
          </P>
        </div>
        <form id={formId} onSubmit={onSubmit} className="grid gap-4">
          <FormField
            label={t('settings.locale_label')}
            tooltip={t('settings.locale_tooltip')}
            error={localeError}>
            <Input
              name="locale"
              className="w-full"
              placeholder={detected ? t('settings.locale_placeholder', { value: detected }) : ''}
              value={locale}
              onChange={e => setLocale(e.target.value)}
            />
          </FormField>
          <P variant="muted" className="text-xs">
            {t('settings.locale_applies')}
          </P>

          {putConfig.isError && <P className="text-error text-sm">{putConfig.error.message}</P>}
          {putConfig.isSuccess && <P className="text-text-muted text-sm">{t('settings.saved')}</P>}

          <div>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              size="sm"
              disabled={putConfig.isPending}>
              {t('settings.save')}
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  );
}
