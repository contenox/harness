/** Minimal shape of the element a terminal is mounted in. */
export interface FitHost {
  clientWidth: number;
  clientHeight: number;
  isConnected: boolean;
}

/**
 * xterm throws (inside its viewport sync) when fitted before its renderer exists or while the
 * container has no size (hidden / animating pane). Only fit a live terminal in a laid-out host.
 */
export function canFitTerminal(host: FitHost | null, disposed: boolean): boolean {
  if (disposed || !host) return false;
  return host.isConnected && host.clientWidth > 0 && host.clientHeight > 0;
}

/** Runs `fit` when the guard allows it; swallows xterm's internal errors. Returns whether it fitted. */
export function safeFit(host: FitHost | null, disposed: boolean, fit: () => void): boolean {
  if (!canFitTerminal(host, disposed)) return false;
  try {
    fit();
    return true;
  } catch {
    return false;
  }
}
