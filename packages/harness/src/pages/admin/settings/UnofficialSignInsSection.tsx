import { Button, Checkbox, Dialog, H2, InlineNotice, P, Panel } from '@contenox/ui';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCLIConfig } from '../../../hooks/useCLIConfig';
import { usePutCLIConfig } from '../../../hooks/usePutCLIConfig';
import { AuthContext } from '../../../lib/authContext';

export function UnofficialSignInsSection() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const { data } = useCLIConfig(!!user);
  const putConfig = usePutCLIConfig();
  const [confirming, setConfirming] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const enabled = data?.unofficialSignIns === 'true';

  useEffect(() => {
    if (!putConfig.isSuccess) return;
    const timer = window.setTimeout(() => putConfig.reset(), 3000);
    return () => window.clearTimeout(timer);
  }, [putConfig.isSuccess, putConfig.reset]);

  const save = (on: boolean) => {
    putConfig.reset();
    putConfig.mutate(
      { 'unofficial-sign-ins': on ? 'true' : 'false' },
      { onSuccess: () => closeDialog() },
    );
  };

  const closeDialog = () => {
    setConfirming(false);
    setUnderstood(false);
  };

  return (
    <Panel variant="surface">
      <div className="space-y-4">
        <div className="space-y-1">
          <H2>{t('settingsAdvanced.unofficial_section_title')}</H2>
          <P variant="muted" className="text-sm">
            {t('settingsAdvanced.unofficial_section_description')}
          </P>
        </div>
        <InlineNotice variant="warning" title={t('settingsAdvanced.unofficial_warning_title')}>
          {t('settingsAdvanced.unofficial_warning_body')}
        </InlineNotice>
        <div className="space-y-1">
          <Checkbox
            label={t('settingsAdvanced.unofficial_label')}
            checked={enabled}
            disabled={!data || putConfig.isPending}
            onChange={e => (e.target.checked ? setConfirming(true) : save(false))}
          />
          <P variant="muted" className="pl-6 text-xs">
            {t(
              enabled
                ? 'settingsAdvanced.unofficial_on_description'
                : 'settingsAdvanced.unofficial_off_description',
            )}
          </P>
        </div>
        {putConfig.isError && !confirming && (
          <P className="text-error text-sm">{putConfig.error.message}</P>
        )}
        {putConfig.isSuccess && <P className="text-text-muted text-sm">{t('settings.saved')}</P>}
      </div>

      <Dialog
        open={confirming}
        onClose={closeDialog}
        title={t('settingsAdvanced.unofficial_confirm_title')}
        className="w-[min(32rem,90vw)]">
        <div className="space-y-4">
          <P>{t('settingsAdvanced.unofficial_confirm_body')}</P>
          <Checkbox
            label={t('settingsAdvanced.unofficial_confirm_ack')}
            checked={understood}
            onChange={e => setUnderstood(e.target.checked)}
          />
          {putConfig.isError && <P className="text-error text-sm">{putConfig.error.message}</P>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              palette="neutral"
              size="sm"
              className="w-full sm:w-auto"
              onClick={closeDialog}>
              {t('settingsAdvanced.unofficial_confirm_cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="w-full sm:w-auto"
              isLoading={putConfig.isPending}
              disabled={!understood || putConfig.isPending}
              onClick={() => save(true)}>
              {t('settingsAdvanced.unofficial_confirm_accept')}
            </Button>
          </div>
        </div>
      </Dialog>
    </Panel>
  );
}
