import { Button, InlineNotice } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import { useDeleteExternalAgent } from '../../../../hooks/useExternalAgents';

type Props = {
  name: string;
  title: string;
  preset: boolean;
  onDone: () => void;
};

export function AgentRemoveConfirm({ name, title, preset, onDone }: Props) {
  const { t } = useTranslation();
  const remove = useDeleteExternalAgent();
  return (
    <InlineNotice variant="warning" className="flex flex-col gap-3">
      <span>{t(preset ? 'external_agents.remove_confirm_preset' : 'external_agents.remove_confirm', { name: title })}</span>
      {remove.error && <span role="alert">{remove.error.message}</span>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {t('external_agents.cancel')}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          isLoading={remove.isPending}
          onClick={() => remove.mutate(name, { onSuccess: onDone })}>
          {t('external_agents.remove_confirm_action')}
        </Button>
      </div>
    </InlineNotice>
  );
}
