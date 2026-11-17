import { apiFetch } from './fetch';

export interface LocalModel {
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
export type LocalAction = 'download' | 'use';
export interface ModelOperation {
  id: string;
  model: string;
  action: LocalAction;
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
export const localAI = {
  models: () => apiFetch<LocalModel[]>(root + '/models'),
  hardware: () => apiFetch<LocalHardware>(root + '/hardware'),
  status: () => apiFetch<LocalStatus>(root + '/status'),
  unload: (instance: string) =>
    apiFetch<boolean>(root + '/workers/unload', {
      method: 'POST',
      body: JSON.stringify({ instance }),
    }),
  progress: () => apiFetch<ModelOperation>(root + '/operations/current'),
  start: (model: string, action: LocalAction, token?: string) =>
    apiFetch<ModelOperation>(root + '/operations', {
      method: 'POST',
      body: JSON.stringify({ model, action, token }),
    }),
  cancel: (id: string) =>
    apiFetch<ModelOperation>(root + '/operations/' + encodeURIComponent(id), { method: 'DELETE' }),
  remove: (name: string) =>
    apiFetch<boolean>(root + '/models/' + encodeURIComponent(name), { method: 'DELETE' }),
};
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
