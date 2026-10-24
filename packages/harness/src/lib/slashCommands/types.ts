import type { ChatContextArtifact } from '../types';

export interface SlashCommandContext {
  armArtifact: (sourceId: string, label: string, artifact: ChatContextArtifact) => void;

  notify: (level: 'info' | 'error', message: string) => void;

  readonly commandName: string;
  readonly rawArgs: string;
}

export type CommandTrigger = '/' | '@';

export interface SlashCommand {
  trigger?: CommandTrigger;
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  execute: (ctx: SlashCommandContext) => void | Promise<void>;

  argCompletions?: (partial: string) => CommandCompletion[];
}

export interface CommandCompletion {
  value: string;
  hint?: string;
}
