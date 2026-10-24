import { ConfigOptionControl } from '../config/ConfigOptionControl';
import { agentControlOption, type SessionAgentsState } from '../lib/sessionAgents';

export interface AgentSelectorProps {
  state: SessionAgentsState;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AgentSelector({ state, value, onChange, disabled }: AgentSelectorProps) {
  const option = agentControlOption(state, value);
  if (option === null) return null;

  return (
    <ConfigOptionControl
      option={option}
      value={value ?? ''}
      disabled={disabled}





      hint="Fixed at creation"
      onChange={next => onChange(String(next))}
    />
  );
}
