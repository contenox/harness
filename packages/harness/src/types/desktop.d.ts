export {};

declare global {
  interface Window {
    contenoxDesktop?: {
      selectDirectory(): Promise<string | null>;
      pickWorkspace(): Promise<string | null>;
      useWorkspace(workspace: string): Promise<{ ok: boolean; error?: string }>;
      openWorkspace(): Promise<{ ok: boolean; error?: string; cancelled?: boolean }>;
      recentWorkspaces(): Promise<string[]>;
      currentWorkspace(): Promise<{ ok: boolean; workspace: string | null }>;
      forgetRecent(workspace: string): Promise<{ ok: boolean; recent?: string[]; error?: string }>;
    };
  }
}
