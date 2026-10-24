
import type { ChatContextArtifact } from '../types';

export const ARTIFACT_KINDS = [
  'file_excerpt',
  'terminal_output',
  'open_file',
  'plan_step',
  'command_output',
  'runtime_state',
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export interface FileExcerptPayload {
  path: string;
  text: string;
  truncated?: boolean;
}

export interface TerminalOutputPayload {
  session_id?: string;
  command?: string;
  output: string;
  captured_at?: string;
  truncated?: boolean;
}

export interface OpenFilePayload {
  path: string;
  text: string;
  line_from?: number;
  line_to?: number;
}

export interface PlanStepPayload {
  plan_id: string;
  ordinal: number;
  description: string;
  status: string;
  summary?: string;
  failure_class?: string;
  last_failure?: string;
}

export interface CommandOutputPayload {
  command: string;
  output: string;
  exit_code?: number;
}

export interface RuntimeStatePayload {
  name: string;
  data?: unknown;
}

export type TypedArtifact =
  | { kind: 'file_excerpt'; payload: FileExcerptPayload }
  | { kind: 'terminal_output'; payload: TerminalOutputPayload }
  | { kind: 'open_file'; payload: OpenFilePayload }
  | { kind: 'plan_step'; payload: PlanStepPayload }
  | { kind: 'command_output'; payload: CommandOutputPayload }
  | { kind: 'runtime_state'; payload: RuntimeStatePayload };

export function isTypedArtifact(a: ChatContextArtifact): a is TypedArtifact {
  return (ARTIFACT_KINDS as readonly string[]).includes(a.kind);
}

export const Artifact = {
  fileExcerpt(p: FileExcerptPayload): TypedArtifact {
    return { kind: 'file_excerpt', payload: p };
  },
  terminalOutput(p: TerminalOutputPayload): TypedArtifact {
    return { kind: 'terminal_output', payload: p };
  },
  openFile(p: OpenFilePayload): TypedArtifact {
    return { kind: 'open_file', payload: p };
  },
  planStep(p: PlanStepPayload): TypedArtifact {
    return { kind: 'plan_step', payload: p };
  },
  commandOutput(p: CommandOutputPayload): TypedArtifact {
    return { kind: 'command_output', payload: p };
  },
  runtimeState(p: RuntimeStatePayload): TypedArtifact {
    return { kind: 'runtime_state', payload: p };
  },
};
