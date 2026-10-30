import { Button, InlineNotice } from '@contenox/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatErrorCard } from './ChatErrorCard';

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
  return (
    <ChatErrorCard
      message={message}
      fallbackTitleKey="acp_chat.error_banner_headline"
      actions={kind =>
        kind === 'model_unavailable' ? (
          <Button type="button" variant="secondary" size="sm" onClick={onOpenSettings}>
            {t('acp_recovery.model_unavailable_action')}
          </Button>
        ) : null
      }
    />
  );
}
