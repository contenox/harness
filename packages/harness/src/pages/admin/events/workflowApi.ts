import { cwdApiFetch } from '../../../lib/projectRuntime';

export type Definition = { name: string; source: string; revision: string };
export type Change = { path: string; before?: string; after?: string };
export type WorkflowStatus =
  | 'running'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'failed'
  | 'applying';
export interface WorkflowRun {
  id: string;
  name: string;
  revision: string;
  origin: string;
  status: WorkflowStatus;
  summary: string;
  error?: string;
  created: string;
  changes?: Change[];
  model?: {
    provider: string;
    model: string;
    milliseconds: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}
export function workflowURL(root: string, route: string) {
  return '/api/workspace/' + route + '?root=' + encodeURIComponent(root);
}
export function workflowRequest<T>(
  root: string,
  route: string,
  method = 'GET',
  body?: unknown,
  params?: Record<string, string>,
) {
  return cwdApiFetch<T>(
    root,
    workflowURL(root, route) + (params ? '&' + new URLSearchParams(params) : ''),
    { method, body: body === undefined ? undefined : JSON.stringify(body) },
  );
}
export const definitionRoute = (name: string) => 'workflows/' + encodeURIComponent(name);
export const runRoute = (id: string) => 'workflow-runs/' + encodeURIComponent(id);
