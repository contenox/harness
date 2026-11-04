import { Disclosure, KeyValue, P } from '@contenox/ui';
import { useTranslation } from 'react-i18next';
import type { ExternalAgent } from '../../../../lib/types';

type Props = {
  agent: ExternalAgent;
};

const ROW = 'text-[13px] leading-5';
const LABEL = 'w-28 font-normal text-text-muted';
const VALUE = 'whitespace-normal [overflow-wrap:anywhere]';

export function AgentAccess({ agent }: Props) {
  const { t } = useTranslation();
  const writable = agent.paths.filter(p => p.mode === 'rw');
  const rows: Array<[string, string]> = [
    [
      t('external_agents.access.writes'),
      t('external_agents.access.writes_value', {
        folders: writable.length ? writable.map(p => p.path).join(', ') : t('external_agents.access.none'),
      }),
    ],
    [
      t('external_agents.access.reads'),
      t(agent.sandbox?.readsLimited ? 'external_agents.access.reads_limited' : 'external_agents.access.reads_open'),
    ],
    [t('external_agents.access.asks'), t('external_agents.access.asks_value')],
    [t('external_agents.access.modes'), agent.modes.length ? agent.modes.join(', ') : t('external_agents.access.none')],
  ];
  return (
    <Disclosure label={t('external_agents.access.title')}>
      <div className="flex flex-col gap-1.5">
        {rows.map(([label, value]) => (
          <KeyValue key={label} label={label} value={value} className={ROW} labelClassName={LABEL} valueClassName={VALUE} />
        ))}
        <P variant="muted" className="pt-1 text-xs [overflow-wrap:anywhere]">
          {t('external_agents.access.command', { command: [agent.command, ...agent.args].join(' ') })}
        </P>
      </div>
    </Disclosure>
  );
}
