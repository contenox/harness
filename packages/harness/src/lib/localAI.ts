import { createContext, useContext } from 'react';
import { apiFetch } from './fetch';
import { projectApiFetch } from './projectRuntime';

export interface LocalModel {
  lora?: boolean;
  mediaError?: string;
  mediaEnabled?: boolean;
  mediaDevice?: MediaTarget;
  pipeline?: string;
  name: string;
  label: string;
  engine: string;
  bytes: number;
  installed: boolean;
  primary: boolean;
  assigned: boolean;
  chat: boolean;
}
export interface LocalHardware {
  device: string;
  memory: number;
  systemMemory: number;
  recommendation: string;
}
export type MediaTarget = { mode: 'automatic' | 'cpu' | 'accelerator'; device_id?: string };
export type NativeDevice = {
  id: string;
  name: string;
  description?: string;
  type: string;
  state: string;
  error?: string;
  operations: string[];
};
export type LocalAction = 'download' | 'use' | 'use-media';
export interface ModelOperation {
  target?: MediaTarget;
  id: string;
  model: string;
  action: LocalAction | 'import';
  tokenOrigin?: string;
  phase: '' | 'prepare' | 'download' | 'verify' | 'done' | 'cancelled' | 'failed';
  current: number;
  total: number;
  error?: string;
  accessUrl?: string;
  failure?: 'capacity' | 'busy' | 'prepare' | 'download' | 'verify';
}
export interface LocalStatus {
  state: 'not-installed' | 'not-running' | 'running' | 'stale' | 'unreachable';
  error?: string;
  workers?:
    | {
        instance: string;
        state: string;
        references: number;
        devices: string[] | null;
        error?: string;
        spec: { model: string; backend: string };
      }[]
    | null;
}
const root = '/api/local-ai';
export function createLocalAI(scope = '') {
  const request: typeof apiFetch = scope
    ? (url, options) => projectApiFetch(scope, url, options)
    : apiFetch;
  return {
    keys: {
      models: ['local-ai', 'models', scope],
      operation: ['local-ai', 'operation', scope],
      devices: ['local-ai', 'media-devices', scope],
      hardware: ['local-ai', 'hardware', scope],
      status: ['local-ai', 'status', scope],
    },
    models: () => request<LocalModel[]>(root + '/models'),
    renderMedia: (
      workspace: string,
      kind: 'image' | 'video',
      prompt: string,
      seconds: number,
      signal: AbortSignal,
    ) =>
      request<{ file: string }>(
        '/api/workspace/media/render?root=' + encodeURIComponent(workspace),
        {
          method: 'POST',
          body: JSON.stringify({ kind, prompt, seconds: kind === 'video' ? seconds : undefined }),
          signal,
          timeoutMs: null,
        },
      ),
    mediaDevices: () => request<NativeDevice[]>(root + '/media-devices'),
    hardware: () => request<LocalHardware>(root + '/hardware'),
    status: () => request<LocalStatus>(root + '/status'),
    unload: (instance: string) =>
      request<boolean>(root + '/workers/unload', {
        method: 'POST',
        body: JSON.stringify({ instance }),
      }),
    progress: () => request<ModelOperation>(root + '/operations/current'),
    register: (name: string, sourceUrl: string) =>
      request('/api/model-registry', { method: 'POST', body: JSON.stringify({ name, sourceUrl }) }),
    upload: (name: string, engine: string, body: FormData, signal: AbortSignal) =>
      request<ModelOperation>(root + '/imports/' + encodeURIComponent(name) + '?engine=' + engine, {
        method: 'POST',
        body,
        signal,
        timeoutMs: null,
        headers: { 'X-Contenox-Import': '1' },
      }),
    start: (
      model: string,
      action: LocalAction,
      token?: string,
      tokenOrigin?: string,
      target?: MediaTarget,
    ) =>
      request<ModelOperation>(root + '/operations', {
        method: 'POST',
        body: JSON.stringify({ model, action, token, tokenOrigin, target }),
      }),
    cancel: (id: string) =>
      request<ModelOperation>(root + '/operations/' + encodeURIComponent(id), { method: 'DELETE' }),
    remove: (name: string) =>
      request<boolean>(root + '/models/' + encodeURIComponent(name), { method: 'DELETE' }),
  };
}
export const localAI = createLocalAI();
export const LocalAIContext = createContext(localAI);
export const useLocalAI = () => useContext(LocalAIContext);
export const isWorking = (phase?: ModelOperation['phase']) =>
  phase === 'prepare' || phase === 'download' || phase === 'verify';
export function modelSize(bytes: number, locale: string) {
  const large = bytes >= 1_000_000_000;
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: large ? 'gigabyte' : 'megabyte',
    maximumFractionDigits: 1,
  }).format(bytes / (large ? 1_000_000_000 : 1_000_000));
}
