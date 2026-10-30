import { Button, OneTimeCode, P, Span, Spinner, Step, Steps } from '@contenox/ui';
import { useTranslation } from 'react-i18next';

type Props = {
  url: string;
  code: string;
  codeCopied: boolean;
  cancelling: boolean;
  onCancel: () => void;
};

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}

/** What to do after the browser opened: sign in, enter the code, confirm; with a quiet cancel. */
export function DeviceCodeSteps({ url, code, codeCopied, cancelling, onCancel }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full flex-col gap-5">
      <Steps>
        <Step number={1} title={t('signin.step_open_title')}>
          <span>{t('signin.step_open_desc')} </span>
          <Button
            type="button"
            variant="text"
            size="xs"
            className="inline-flex h-auto px-0 align-baseline"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
            {displayUrl(url)}
          </Button>
        </Step>
        <Step number={2} title={t('signin.step_code_title')}>
          <OneTimeCode
            value={code}
            copied={codeCopied}
            copyLabel={t('signin.code_copy')}
            copiedLabel={t('signin.code_copied')}
          />
        </Step>
        <Step number={3} title={t('signin.step_confirm_title')}>
          {t('signin.step_confirm_desc')}
        </Step>
      </Steps>

      <div className="flex items-center justify-between gap-3">
        <Span variant="muted" className="flex items-center gap-2 text-sm" role="status">
          <Spinner size="xs" />
          {t('signin.waiting')}
        </Span>
        <Button type="button" variant="ghost" size="sm" isLoading={cancelling} onClick={onCancel}>
          {t('signin.cancel')}
        </Button>
      </div>

      <P variant="muted" className="text-xs">
        {t('signin.device_hint')}
      </P>
    </div>
  );
}
