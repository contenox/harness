import { describe, expect, it } from 'vitest';
import type { SessionConfigOption } from '@contenox/acp-client';
import {
  AGENT_CONFIG_ID,
  agentControlOption,
  agentLabel,
  agentNameForNewSession,
  deriveSessionAgents,
  hasAgentChoice,
  isAdvertisedAgent,
  isNativeAgent,
  NATIVE_AGENT_VALUE,
  selectedAgent,
} from './sessionAgents';


function agentsOption(names: string[], currentValue = NATIVE_AGENT_VALUE): SessionConfigOption {
  return {
    id: AGENT_CONFIG_ID,
    name: 'Agent',
    description: 'Which agent answers in this session. Bound when the session is created.',
    category: 'agent',
    type: 'select',
    currentValue,
    options: [
      { value: NATIVE_AGENT_VALUE, name: 'contenox', description: "The machine's own chain" },
      ...names.map(name => ({ value: name, name })),
    ],
  };
}

const MODEL_OPTION: SessionConfigOption = {
  id: 'model',
  name: 'Model',
  type: 'select',
  currentValue: 'local/qwen3-coder',
  options: [{ value: 'local/qwen3-coder', name: 'qwen3-coder' }],
};

describe('deriveSessionAgents: the three states', () => {
  it('reports ABSENT when the machine advertised no agent option', () => {
    const state = deriveSessionAgents([MODEL_OPTION]);
    expect(state.isAbsent).toBe(true);
    expect(state.agents).toEqual([]);
    expect(state.defaultAgent).toBeNull();
  });

  it('reports absent for a machine that advertised no options at all', () => {
    expect(deriveSessionAgents([]).isAbsent).toBe(true);
    expect(deriveSessionAgents(undefined).isAbsent).toBe(true);
  });

  it('reports an advertised-but-empty registry as present, not as absent', () => {





    const state = deriveSessionAgents([{ ...agentsOption([]), options: [] }]);
    expect(state.isAbsent).toBe(false);
    expect(state.agents).toEqual([]);
    expect(state.defaultAgent).toBeNull();
  });

  it('keeps the native chain as a value rather than dropping the blank one', () => {




    const state = deriveSessionAgents([agentsOption(['strict-reviewer'])]);
    expect(state.agents).toEqual([
      { value: '', name: 'contenox', native: true },
      { value: 'strict-reviewer', name: 'strict-reviewer', native: false },
    ]);
  });

  it("keeps the machine's own order and names", () => {
    const state = deriveSessionAgents([agentsOption(['strict-reviewer', 'claude-code'])]);
    expect(state.agents.map(agent => agent.value)).toEqual(['', 'strict-reviewer', 'claude-code']);
  });

  it('names the native chain even when the machine sent no label for it', () => {
    const option = agentsOption([]);
    option.options = [{ value: '', name: '' }];
    expect(deriveSessionAgents([option]).agents).toEqual([
      { value: '', name: 'contenox', native: true },
    ]);
  });

  it('falls back to the agent name when the machine sent no label', () => {
    const option = agentsOption([]);
    option.options = [{ value: 'doc-writer', name: '' }];
    expect(deriveSessionAgents([option]).agents).toEqual([
      { value: 'doc-writer', name: 'doc-writer', native: false },
    ]);
  });

  it('drops a duplicate value rather than offering the same agent twice', () => {
    const option = agentsOption([]);
    option.options = [
      { value: 'doc-writer', name: 'doc-writer' },
      { value: 'doc-writer', name: 'doc-writer (again)' },
    ];
    expect(deriveSessionAgents([option]).agents).toHaveLength(1);
  });
});

describe("deriveSessionAgents: the machine's default", () => {
  it('takes the currentValue when it is one of the agents offered', () => {
    const state = deriveSessionAgents([agentsOption(['strict-reviewer'], 'strict-reviewer')]);
    expect(state.defaultAgent).toBe('strict-reviewer');
  });

  it('takes the native chain as a default like any other value', () => {


    const state = deriveSessionAgents([agentsOption(['strict-reviewer'])]);
    expect(state.defaultAgent).toBe(NATIVE_AGENT_VALUE);
    expect(state.defaultAgent).not.toBeNull();
  });

  it('ignores a currentValue naming something the machine did not offer', () => {
    const state = deriveSessionAgents([agentsOption(['strict-reviewer'], 'retired-bot')]);
    expect(state.defaultAgent).toBeNull();
  });
});

describe('selectedAgent', () => {
  const state = deriveSessionAgents([agentsOption(['strict-reviewer', 'doc-writer'])]);

  it("keeps the user's pick while the machine still offers it", () => {
    expect(selectedAgent(state, 'doc-writer')).toBe('doc-writer');
  });

  it('drops a pick the machine no longer offers, back to its default', () => {



    expect(selectedAgent(state, 'retired-bot')).toBe(NATIVE_AGENT_VALUE);
  });

  it('falls back to the first agent when the machine named no default', () => {
    const noDefault = deriveSessionAgents([agentsOption(['strict-reviewer'], 'retired-bot')]);
    expect(selectedAgent(noDefault, null)).toBe(NATIVE_AGENT_VALUE);
  });

  it('is null for a machine that offered nothing', () => {
    expect(selectedAgent(deriveSessionAgents(undefined), null)).toBeNull();
  });
});

describe('agentNameForNewSession: what reaches the wire', () => {
  it('sends the name of a registered agent verbatim', () => {
    expect(agentNameForNewSession('strict-reviewer')).toBe('strict-reviewer');
  });

  it('sends nothing for the native chain, so session/new carries no _meta', () => {
    expect(agentNameForNewSession(NATIVE_AGENT_VALUE)).toBeNull();
  });

  it('sends nothing when there is no selection at all', () => {
    expect(agentNameForNewSession(null)).toBeNull();
  });

  it('treats whitespace as the native chain rather than as a name', () => {
    expect(isNativeAgent('   ')).toBe(true);
    expect(agentNameForNewSession('   ')).toBeNull();
  });
});

describe('what the picker renders', () => {
  it('offers nothing when the machine advertised no option', () => {
    expect(agentControlOption(deriveSessionAgents(undefined), null)).toBeNull();
  });

  it('offers nothing when there is only one thing to choose', () => {


    const onlyNative = deriveSessionAgents([agentsOption([])]);
    expect(hasAgentChoice(onlyNative)).toBe(false);
    expect(agentControlOption(onlyNative, null)).toBeNull();
  });

  it('renders the machine option with the live pick as its currentValue', () => {
    const state = deriveSessionAgents([agentsOption(['strict-reviewer', 'doc-writer'])]);
    const option = agentControlOption(state, 'doc-writer');
    expect(option).not.toBeNull();
    expect(option!.id).toBe(AGENT_CONFIG_ID);
    expect(option!.name).toBe('Agent');


    expect(option!.currentValue).toBe('doc-writer');
    expect(option!.options).toEqual([
      { value: '', name: 'contenox · default' },
      { value: 'strict-reviewer', name: 'strict-reviewer' },
      { value: 'doc-writer', name: 'doc-writer' },
    ]);
  });

  it('marks the default, whichever it is', () => {
    const state = deriveSessionAgents([agentsOption(['strict-reviewer'], 'strict-reviewer')]);
    expect(agentLabel(state, state.agents[1])).toBe('strict-reviewer · default');
    expect(agentLabel(state, state.agents[0])).toBe('contenox');
  });
});

describe('isAdvertisedAgent', () => {
  const state = deriveSessionAgents([agentsOption(['strict-reviewer'])]);

  it('accepts what the machine offered, including the native chain', () => {
    expect(isAdvertisedAgent(state, 'strict-reviewer')).toBe(true);
    expect(isAdvertisedAgent(state, NATIVE_AGENT_VALUE)).toBe(true);
  });

  it('refuses a name the machine never offered, and no selection', () => {
    expect(isAdvertisedAgent(state, 'retired-bot')).toBe(false);
    expect(isAdvertisedAgent(state, null)).toBe(false);
  });
});
