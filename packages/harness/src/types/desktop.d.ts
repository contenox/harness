export {};

declare global {
  interface Window {
    contenoxDesktop?: {
      selectDirectory(): Promise<string | null>;
      pickWorkspace(): Promise<string | null>;
      useWorkspace(workspace: string): Promise<{ ok: boolean; error?: string }>;
      openWorkspace(): Promise<boolean>;
      recentWorkspaces(): Promise<string[]>;
    };
  }
}
