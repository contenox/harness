import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/fetch';
import { cwdApiFetch } from '../lib/projectRuntime';
import { terminalKeys } from '../lib/queryKeys';
import type { TerminalSession } from '../lib/types';

export type HostTerminalSessionData = TerminalSession | null;

export async function createHostTerminalSession(
  cwd: string,
  cols: number,
  rows: number,
): Promise<HostTerminalSessionData> {
  try {
    // Routed to the runtime that owns `cwd`, so the shell starts in that project's runtime.
    return await cwdApiFetch<TerminalSession>(cwd, '/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ ...(cwd ? { cwd } : {}), cols, rows }),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface HostTerminalSessionState {
  session?: TerminalSession;
  isAbsent: boolean;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

export interface UseHostTerminalSessionOptions {
  enabled: boolean;
  cwd?: string;
  cols?: number;
  rows?: number;
}

export function useHostTerminalSession(
  ownerKey: string,
  options: UseHostTerminalSessionOptions,
): HostTerminalSessionState {
  const { enabled, cwd = '', cols = 80, rows = 24 } = options;
  const query = useQuery<HostTerminalSessionData, Error>({
    queryKey: terminalKeys.session(ownerKey),
    queryFn: () => createHostTerminalSession(cwd, cols, rows),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  return {
    session: query.data ?? undefined,
    isAbsent: query.data === null,
    isLoading: query.isLoading && enabled,
    error: query.error ?? null,
    retry: () => void query.refetch(),
  };
}
