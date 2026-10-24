import { useEffect, useState } from 'react';
import {
  groupMatchesByFile,
  runWorkspaceSearch,
  type SearchFetch,
  type SearchFileGroup,
} from '../lib/workspaceSearch';
import type { WorkspaceSearchMatch } from '../lib/types';


export type SearchStatus = 'idle' | 'searching' | 'done' | 'refusal' | 'dependency' | 'error';

export interface WorkspaceSearchState {
  status: SearchStatus;
  groups: SearchFileGroup[];
  matchCount: number;
  truncated: boolean;
  refusalMessage?: string;
  errorMessage?: string;
}

const IDLE: WorkspaceSearchState = {
  status: 'idle',
  groups: [],
  matchCount: 0,
  truncated: false,
};

const DEBOUNCE_MS = 300;
const FLUSH_MS = 60;

export interface UseWorkspaceSearchOptions {
  query: string;
  root?: string;
  limit?: number;
  nonce?: number;
  fetchImpl?: SearchFetch;
}

export function useWorkspaceSearch({
  query,
  root,
  limit,
  nonce,
  fetchImpl,
}: UseWorkspaceSearchOptions): WorkspaceSearchState {
  const [debounced, setDebounced] = useState('');
  const [state, setState] = useState<WorkspaceSearchState>(IDLE);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '') {
      setDebounced('');
      return;
    }
    const id = setTimeout(() => setDebounced(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (debounced === '') {
      setState(IDLE);
      return;
    }

    const controller = new AbortController();
    const matches: WorkspaceSearchMatch[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const flush = () => {
      flushTimer = null;
      if (closed) return;
      setState(prev => ({
        ...prev,
        status: 'searching',
        groups: groupMatchesByFile(matches),
        matchCount: matches.length,
      }));
    };

    setState({ status: 'searching', groups: [], matchCount: 0, truncated: false });

    void runWorkspaceSearch({
      query: debounced,
      root,
      limit,
      signal: controller.signal,
      fetchImpl,
      onMatch: m => {
        matches.push(m);
        if (flushTimer === null) flushTimer = setTimeout(flush, FLUSH_MS);
      },
      onDone: done => {
        closed = true;
        if (flushTimer !== null) clearTimeout(flushTimer);
        setState({
          status: 'done',
          groups: groupMatchesByFile(matches),
          matchCount: matches.length,
          truncated: done.truncated,
        });
      },
      onRefusal: refusal => {
        closed = true;
        if (flushTimer !== null) clearTimeout(flushTimer);
        if (refusal.kind === 'dependency') {
          setState({ ...IDLE, status: 'dependency', errorMessage: refusal.message });
        } else {
          setState({ ...IDLE, status: 'refusal', refusalMessage: refusal.message });
        }
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
  }, [debounced, root, limit, nonce, fetchImpl]);

  return state;
}
