import { Button, Collapsible, InlineNotice, Span } from '@contenox/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { acpFailureCopyKeys, classifyAcpExecutionError } from '../../../lib/acpFailureKind';

export function ResumedBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(id);
  }, []);
  if (!visible) return null;
  return <InlineNotice variant="info">{t('acp_chat.banner_resumed')}</InlineNotice>;
}

export function ExecutionErrorBanner({ message, onOpenSettings }: { message: string; onOpenSettings: () => void }) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const kind = classifyAcpExecutionError(message);
  const copy = acpFailureCopyKeys(kind);

  const headline = copy.titleKey ? tk(copy.titleKey) : t('acp_chat.error_banner_headline');
  const hint = copy.descriptionKey ? tk(copy.descriptionKey) : null;

  return (
    <InlineNotice variant="error">
      <div className="flex flex-col gap-1.5">
        <Span className="font-medium">{headline}</Span>
        {hint && <Span className="text-sm">{hint}</Span>}
        {kind === 'model_unavailable' && (
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={onOpenSettings}>
              {t('acp_recovery.model_unavailable_action')}
            </Button>
          </div>
        )}
        <Collapsible defaultOpen={false} title={t('acp_chat.error_details_toggle')}>
          <p className="mt-1 text-xs whitespace-pre-wrap">{message}</p>
        </Collapsible>
      </div>
    </InlineNotice>
  );
}
