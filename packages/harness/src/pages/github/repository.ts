import { cwdApiFetch } from '../../lib/projectRuntime';

export interface Remote {
  name: string;
  repo: string;
}
export interface Binding extends Remote {
  id: number;
  credential: string;
}
export interface State {
  binding: Binding | null;
  remotes: Remote[];
  branch?: string;
}
export interface Pull {
  number: number;
  title: string;
  body?: string;
  authorLogin: string;
  head: string;
  headOwner: string;
  ref: string;
  base: string;
  url: string;
  draft: boolean;
}
export interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}
export interface Comment {
  id: number;
  replyTo?: number;
  path: string;
  line?: number;
  author: string;
  body: string;
}
export interface ResultPage<T> {
  items: T[];
  nextCursor?: string;
}

export function repositoryApi<T>(
  root: string,
  view = '',
  params: Record<string, string> = {},
  options?: RequestInit,
) {
  const query = new URLSearchParams({ root, ...params });
  return cwdApiFetch<T>(
    root,
    '/api/workspace/github' + (view ? '/' + view : '') + '?' + query,
    options,
  );
}
export function jsonRequest(method: string, value: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) };
}
export function reviewFile(repoId: number, pr: Pull) {
  return `reviews/github-${repoId}-pr-${pr.number}-${pr.ref.slice(0, 12)}.md`;
}
