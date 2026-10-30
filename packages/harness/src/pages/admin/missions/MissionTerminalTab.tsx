import { HostTerminalPane } from '../../../components/terminal/HostTerminalPane';

export interface MissionTerminalTabProps {
  missionId: string;
}

export default function MissionTerminalTab({ missionId }: MissionTerminalTabProps) {
  return (
    <HostTerminalPane
      ownerKey={missionId}
      terminalClassName="border-surface-200 dark:border-dark-surface-600 h-[60vh] min-h-[24rem] overflow-hidden rounded-lg border"
    />
  );
}
