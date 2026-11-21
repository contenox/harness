import { Button, InlineNotice, Select } from '@contenox/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalAI, type LocalModel, type MediaTarget } from '../../lib/localAI';

export function MediaRoleControl({
  model,
  disabled,
  onAssign,
}: {
  model: LocalModel;
  disabled: boolean;
  onAssign: (target: MediaTarget) => void;
}) {
  const { t } = useTranslation();
  const localAI = useLocalAI();
  const role =
    model.pipeline === 'StableDiffusionPipeline' ? 'image-generation' : 'video-generation';
  const current = model.mediaDevice?.device_id || model.mediaDevice?.mode || 'automatic';
  const [choice, setChoice] = useState<string>();
  const selected = choice ?? current;
  const devices = useQuery({
    queryKey: localAI.keys.devices,
    queryFn: localAI.mediaDevices,
    retry: false,
  });
  const options = [
    { value: 'automatic', label: t('mediaGeneration.automatic') },
    ...(devices.data ?? [])
      .filter(d => d.operations?.includes(role))
      .map(d => ({
        value: d.type === 'cpu' ? 'cpu' : d.id,
        label: [d.description || d.name, d.state !== 'available' && d.error]
          .filter(Boolean)
          .join(' · '),
        disabled: d.state !== 'available',
      })),
  ];
  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-sm">
        {t('mediaGeneration.device')}
        <Select
          value={selected}
          options={options}
          disabled={disabled}
          onChange={e => setChoice(e.target.value)}
        />
      </label>
      {devices.error && <InlineNotice variant="error">{devices.error.message}</InlineNotice>}
      <Button
        size="sm"
        disabled={disabled || (model.mediaEnabled && selected === current)}
        onClick={() =>
          onAssign(
            selected === 'automatic' || selected === 'cpu'
              ? { mode: selected }
              : { mode: 'accelerator', device_id: selected },
          )
        }>
        {t(
          model.mediaEnabled && selected === current
            ? 'mediaGeneration.roleActive'
            : 'mediaGeneration.verifyRole',
        )}
      </Button>
    </div>
  );
}
