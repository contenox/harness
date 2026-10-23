import { ConfigOptionControl } from '../config/ConfigOptionControl';
import { agentControlOption, type SessionAgentsState } from '../lib/sessionAgents';

/**
 * Which agent a new session runs as, chosen from what the machine registered.
 */
export interface AgentSelectorProps {
  state: SessionAgentsState;
  /**
   * The currently-selected agent — one of `state.agents`, or null when there is none.
   */
  value: string | null;
  onChange: (value: string) => void;
  /**
   * Held while the connection is not ready, so nothing can be bound before the list is known.
   */
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
