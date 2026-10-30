import { PaneFrame, Tabs, type Tab } from '@contenox/ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HostTerminalPane } from '../../../components/terminal/HostTerminalPane';
import { PaneNotice } from './PaneNotice';
import { TerminalTab } from './TerminalTab';

export interface TerminalPaneProps {
  sessionId: string | null;
  /** The session's project folder; the shell starts (and is routed) there. */
  cwd: string | null;
  /** True once a `!command` passthrough has produced output for this session. */
  agentOutputAvailable: boolean;
  onClose: () => void;
}

type View = 'shell' | 'agent';

/** Real PTY in the session's project folder, plus the read-only `!command` passthrough output. */
export function TerminalPane({ sessionId, cwd, agentOutputAvailable, onClose }: TerminalPaneProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('shell');

  useEffect(() => {
    if (agentOutputAvailable) setView('agent');
  }, [agentOutputAvailable]);

  const ownerKey = `chat:${sessionId ?? 'staged'}:${cwd ?? ''}`;
  const tabs = useMemo<Tab<View>[]>(
    () => [
      { id: 'shell', label: t('panes.shell') },
      { id: 'agent', label: t('panes.agent_output') },
    ],
    [t],
  );

  return (
    <PaneFrame
      flush
      title={t('panes.terminal')}
      tabs={agentOutputAvailable ? <Tabs tabs={tabs} activeTab={view} onTabChange={setView} /> : undefined}
      onClose={onClose}
      closeLabel={t('panes.close')}
      bodyClassName="flex flex-col overflow-hidden">
      {view === 'agent' && agentOutputAvailable ? (
        <TerminalTab sessionId={sessionId} />
      ) : cwd ? (
        <HostTerminalPane ownerKey={ownerKey} cwd={cwd} />
      ) : (
        <PaneNotice>{t('panes.no_project')}</PaneNotice>
      )}
    </PaneFrame>
  );
}
