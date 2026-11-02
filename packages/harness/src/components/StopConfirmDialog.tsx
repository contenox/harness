import { Button, Dialog, KeyValue, P } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { stopConfirmCopy } from '../lib/stopFlow';
import type { InstanceStatus } from '../lib/types';
import { PROCESS_LABEL_KEY } from '../lib/unitStatus';

export function StopConfirmDialog({
  instance,
  pending,
  finished = false,
  onConfirm,
  onClose,
}: {
  instance: InstanceStatus;
  pending: boolean;
  finished?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const copy = stopConfirmCopy(instance.state, finished);

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(copy.title)}
      closeLabel={t('fleet.stop_confirm_close')}
      className="w-[min(32rem,90vw)]">
      <P>{t(copy.body)}</P>
      <div className="mt-4 space-y-1">
        <KeyValue label={t('fleet.stop_confirm_agent')} value={instance.agentName} />
        <KeyValue
          label={t('fleet.stop_confirm_instance')}
          value={<span className="font-mono text-xs break-all">{instance.id}</span>}
        />
        <KeyValue
          label={t('fleet.stop_confirm_state')}
          value={t(PROCESS_LABEL_KEY[instance.state])}
        />
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          palette="neutral"
          size="sm"
          className="w-full sm:w-auto"
          onClick={onClose}>
          {t('fleet.stop_confirm_decline')}
        </Button>
        <Button
          variant="danger"
          size="sm"
          className="w-full sm:w-auto"
          isLoading={pending}
          disabled={pending}
          onClick={onConfirm}>
          {t(copy.confirm)}
        </Button>
      </div>
    </Dialog>
  );
}
