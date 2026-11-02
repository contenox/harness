import {
  argumentCompletionsFromCommand,
  FIRST_ARGUMENT_KEY,
  type ArgumentCompletion,
  type AvailableCommand,
} from '@contenox/acp-client';
import type { CommandValueDomains } from './commandValueDomains';

export type RuntimeArgumentCompletions = ReadonlyMap<
  string,
  ReadonlyMap<string, ArgumentCompletion>
>;

export const NO_RUNTIME_COMPLETIONS: RuntimeArgumentCompletions = new Map();

export function runtimeArgumentCompletions(
  commands: readonly AvailableCommand[],
): RuntimeArgumentCompletions {
  const byCommand = new Map<string, ReadonlyMap<string, ArgumentCompletion>>();
  for (const command of commands) {
    const completions = argumentCompletionsFromCommand(command);
    if (completions.size > 0) byCommand.set(command.name, completions);
  }
  return byCommand;
}

export function mergeRuntimeValueDomains(
  domains: CommandValueDomains,
  runtime: RuntimeArgumentCompletions,
): CommandValueDomains {
  if (runtime.size === 0) return domains;
  const merged = new Map<string, readonly string[]>(domains);
  for (const [command, completions] of runtime) {
    const values = completions.get(FIRST_ARGUMENT_KEY)?.values ?? [];
    if (values.length > 0) merged.set(command, values);
  }
  return merged;
}

export function runtimeFlagValues(
  runtime: RuntimeArgumentCompletions,
  command: string,
  flag: string,
): readonly string[] | null {
  const values = runtime.get(command)?.get(flag)?.values ?? [];
  return values.length === 0 ? null : values;
}

export function runtimeArgumentHint(
  runtime: RuntimeArgumentCompletions,
  command: string,
  key: string,
): string | null {
  const hint = runtime.get(command)?.get(key)?.hint ?? '';
  return hint === '' ? null : hint;
}
