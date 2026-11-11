import { Button, InlineNotice, P } from '@contenox/ui';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { displayName } from '../../../../lib/permissions';

type Props = {
  name: string;
  workspaceName: string | undefined;
  inLayer: boolean;
  inUseBy: string[];
  onRemove: () => Promise<void>;
};

export function RemoveSet({ name, workspaceName, inLayer, inUseBy, onRemove }: Props) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = displayName(name);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onRemove();
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (workspaceName !== undefined) {
    if (!inLayer) return null;
    return (
      <div className="flex flex-col items-start gap-2 px-1">
        <Button
          variant="ghost"
          size="sm"
          isLoading={busy}
          disabled={busy}
          onClick={() => void run()}>
          <RotateCcw className="size-3.5" aria-hidden />
          {t('permissions.reset_set_here', { name: workspaceName })}
        </Button>
        <P variant="muted" className="text-xs">
          {t('permissions.reset_set_here_hint')}
        </P>
        {error && (
          <InlineNotice variant="error" role="alert">
            {error}
          </InlineNotice>
        )}
      </div>
    );
  }

  if (!inLayer) return null;

  if (inUseBy.length > 0) {
    return (
      <P variant="muted" className="px-1 text-xs">
        {t('permissions.delete_in_use', { name: title, what: inUseBy.join(', ') })}
      </P>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 px-1">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <P className="text-[13px]">{t('permissions.delete_confirm', { name: title })}</P>
          <Button
            variant="danger"
            solid
            size="sm"
            isLoading={busy}
            disabled={busy}
            onClick={() => void run()}>
            {t('permissions.delete_confirm_button')}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
            {t('permissions.delete_cancel')}
          </Button>
        </div>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 className="size-3.5" aria-hidden />
          {t('permissions.delete_set')}
        </Button>
      )}
      {error && (
        <InlineNotice variant="error" role="alert">
          {error}
        </InlineNotice>
      )}
    </div>
  );
}
