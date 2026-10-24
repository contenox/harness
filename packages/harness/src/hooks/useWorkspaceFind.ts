import { useEffect, useState } from 'react';
import {
  runWorkspaceFind,
  type FindFetch,
  type WorkspaceFindMatch,
} from '../lib/workspaceFind';


export type FindStatus = 'idle' | 'searching' | 'done' | 'refusal' | 'error';

export interface WorkspaceFindState {
  status: FindStatus;
  entries: WorkspaceFindMatch[];
  count: number;
  truncated: boolean;
  refusalMessage?: string;
  errorMessage?: string;
}

const IDLE: WorkspaceFindState = {
  status: 'idle',
  entries: [],
  count: 0,
  truncated: false,
};

const FLUSH_MS = 60;

export interface UseWorkspaceFindOptions {
  globs: string[];
  root?: string;
  filter?: string;
  policy?: string;
  limit?: number;
  nonce?: number;
  fetchImpl?: FindFetch;
}

export function useWorkspaceFind({
  globs,
  root,
  filter,
  policy,
  limit,
  nonce,
  fetchImpl,
}: UseWorkspaceFindOptions): WorkspaceFindState {
  const [state, setState] = useState<WorkspaceFindState>(IDLE);
  const globsKey = globs.join('\n');

  useEffect(() => {
    if (globsKey === '') {
      setState(IDLE);
      return;
    }

    const controller = new AbortController();
    const entries: WorkspaceFindMatch[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const flush = () => {
      flushTimer = null;
      if (closed) return;
      setState(prev => ({
        ...prev,
        status: 'searching',
        entries: entries.slice(),
        count: entries.length,
      }));
    };

    setState({ status: 'searching', entries: [], count: 0, truncated: false });

    void runWorkspaceFind({
      globs: globsKey.split('\n'),
      root,
      filter,
      policy,
      limit,
      signal: controller.signal,
      fetchImpl,
      onMatch: m => {
        entries.push(m);
        if (flushTimer === null) flushTimer = setTimeout(flush, FLUSH_MS);
      },
      onDone: done => {
        closed = true;
        if (flushTimer !== null) clearTimeout(flushTimer);
        setState({
          status: 'done',
          entries: entries.slice(),
          count: entries.length,
          truncated: done.truncated,
        });
      },
      onRefusal: refusal => {
        closed = true;
        if (flushTimer !== null) clearTimeout(flushTimer);
        setState({ ...IDLE, status: 'refusal', refusalMessage: refusal.message });
      },
      onError: message => {
        closed = true;
        if (flushTimer !== null) clearTimeout(flushTimer);
        setState({ ...IDLE, status: 'error', errorMessage: message });
      },
    });

    return () => {
      closed = true;
      if (flushTimer !== null) clearTimeout(flushTimer);
      controller.abort();
    };
  }, [globsKey, root, filter, policy, limit, nonce, fetchImpl]);

  return state;
}
