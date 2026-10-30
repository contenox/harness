export {};

declare global {
  interface Window {
    contenoxDesktop?: {
      /** Node `process.platform` of the desktop shell ('win32', 'darwin', ...). */
      platform: string;
      /** Recolor the native caption-button overlay (Windows) to the renderer theme. */
      setTitleBarTheme(theme: 'dark' | 'light'): void;
      selectDirectory(): Promise<string | null>;
      /** Start (or reuse) the runtime for a project folder. Requests go to `${prefix}/api|acp|ui/...`. */
      ensureProjectRuntime(
        path: string,
      ): Promise<{ ok: true; key: string; prefix: string } | { ok: false; error: string }>;
      stopProjectRuntime(path: string): Promise<{ ok: boolean; error?: string }>;
      /** Folder requested at launch (argv / CONTENOX_WORKSPACE / second instance); returned once. */
      takeLaunchFolder(): Promise<string | null>;
      /** Called when a folder is requested while the app is running. Returns an unsubscribe function. */
      onLaunchFolder(callback: (folder: string) => void): () => void;
    };
  }
}
