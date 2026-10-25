export {};

declare global {
  interface Window {
    contenoxDesktop?: {
      selectDirectory(): Promise<string | null>;
      openWorkspace(): Promise<boolean>;
      recentWorkspaces(): Promise<string[]>;
    };
  }
}
