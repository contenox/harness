import { ConfigOptionControl } from '@contenox/ui/session-ui';
import { Button, Dropdown } from '@contenox/ui';
import type { SessionConfigOption } from '@contenox/acp-client';
import { useTranslation } from 'react-i18next';

export interface ConfigOptionControlsProps {
  configOptions: SessionConfigOption[];
  onChange: (configId: string, value: string | boolean) => void;
}

export function ConfigOptionControls({ configOptions, onChange }: ConfigOptionControlsProps) {
  const { t } = useTranslation();
  if (configOptions.length === 0) return null;

  const controls = configOptions.map(option => (
    <ConfigOptionControl
      key={option.id}
      option={option}
      onChange={value => onChange(option.id, value)}
    />
  ));

  return (
    <>
      <div className="hidden flex-wrap items-center gap-3 sm:flex">{controls}</div>
      <div className="sm:hidden">
        <Dropdown
          trigger={
            <Button type="button" variant="outline" palette="neutral" size="sm">
              {t('acp_chat.config_options_label')}
            </Button>
          }
          contentClassName="w-64 space-y-3 p-3"
        >
          {controls}
        </Dropdown>
      </div>
    </>
  );
}
