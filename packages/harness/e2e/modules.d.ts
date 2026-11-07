declare module '*/mock-openai.mjs' {
  import type { Server } from 'node:http';

  export type MockOpenAIServer = Server & {
    setFailChat(value: boolean): void;
  };

  export function startMockOpenAI(port: number, models?: string[]): Promise<MockOpenAIServer>;
}

declare module '*/proc.mjs' {
  export function pidOnPort(port: number | string): number | null;
  export function stopPort(port: number | string): boolean;
}
