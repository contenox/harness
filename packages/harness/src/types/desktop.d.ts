export {};

declare global {
  interface Window {
    contenoxDesktop?: {
      selectDirectory(): Promise<string | null>;
    };
  }
}
