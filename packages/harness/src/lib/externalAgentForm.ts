import type { ExternalAgent, ExternalAgentInput, ExternalAgentPath } from './types';

export type AgentFormValues = {
  name: string;
  command: string;
  args: string;
  env: string;
  modes: string;
  paths: ExternalAgentPath[];
};

export type AgentFormErrors = Partial<Record<'name' | 'command' | 'env' | 'paths', string>>;

export const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

export const emptyAgentForm: AgentFormValues = {
  name: '',
  command: '',
  args: '',
  env: '',
  modes: '',
  paths: [],
};

export function formFromAgent(agent: ExternalAgent): AgentFormValues {
  return {
    name: agent.name,
    command: agent.command,
    args: agent.args.join('\n'),
    env: Object.entries(agent.env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
    modes: agent.modes.join(', '),
    paths: agent.paths.map(p => ({ ...p })),
  };
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
}

export function parseEnv(text: string): { env: Record<string, string>; bad: string[] } {
  const env: Record<string, string> = {};
  const bad: string[] = [];
  for (const line of lines(text)) {
    const eq = line.indexOf('=');
    if (eq <= 0) {
      bad.push(line);
      continue;
    }
    env[line.slice(0, eq).trim()] = line.slice(eq + 1);
  }
  return { env, bad };
}

export function inputFromForm(values: AgentFormValues, enabled?: boolean): ExternalAgentInput {
  return {
    name: values.name.trim(),
    enabled,
    command: values.command.trim(),
    args: lines(values.args),
    env: parseEnv(values.env).env,
    modes: values.modes
      .split(/[,\s]+/)
      .map(m => m.trim())
      .filter(Boolean),
    paths: values.paths
      .map(p => ({ ...p, path: p.path.trim(), needs: p.needs.trim() }))
      .filter(p => p.path !== ''),
    mcpServers: [],
  };
}

export function validateAgentForm(
  values: AgentFormValues,
  takenNames: string[],
  editing: boolean,
): AgentFormErrors {
  const errors: AgentFormErrors = {};
  const name = values.name.trim();
  if (!editing) {
    if (!NAME_PATTERN.test(name)) errors.name = 'external_agents.form.name_invalid';
    else if (takenNames.includes(name)) errors.name = 'external_agents.form.name_taken';
  }
  if (!values.command.trim()) errors.command = 'external_agents.form.command_required';
  if (parseEnv(values.env).bad.length > 0) errors.env = 'external_agents.form.env_invalid';
  if (values.paths.some(p => p.path.trim() !== '' && p.needs.trim() === ''))
    errors.paths = 'external_agents.form.path_needs_reason';
  return errors;
}
