import type { SetupStatus } from './types';

const STORAGE_KEY = 'beam_setup_wizard_dismissal';

export type WizardDismissalRecord = { fingerprint: string };

export type WizardDismissalSnapshot = {
  record: WizardDismissalRecord | null;
  manualOpen: boolean;
};

const memoryFallback = new Map<string, string>();

function getStorageValue(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
  }
  return memoryFallback.get(key) ?? null;
}

function setStorageValue(key: string, value: string | null): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
      return;
    }
  } catch {
  }
  if (value === null) {
    memoryFallback.delete(key);
  } else {
    memoryFallback.set(key, value);
  }
}

export function computeSetupFingerprint(status: SetupStatus | undefined | null): string {
  if (!status) return 'unknown';
  const errorCodes = (status.issues ?? [])
    .filter(issue => issue.severity === 'error')
    .map(issue => issue.code)
    .sort();
  const reachable = status.reachableBackendCount > 0 ? '1' : '0';
  return `${reachable}|${errorCodes.join(',')}`;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function readRecord(): WizardDismissalRecord | null {
  const raw = getStorageValue(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { fingerprint?: unknown };
    return typeof parsed.fingerprint === 'string' ? { fingerprint: parsed.fingerprint } : null;
  } catch {
    return null;
  }
}

let snapshot: WizardDismissalSnapshot = { record: readRecord(), manualOpen: false };

function setSnapshot(next: WizardDismissalSnapshot): void {
  snapshot = next;
  listeners.forEach(listener => listener());
}

export function getWizardDismissalSnapshot(): WizardDismissalSnapshot {
  return snapshot;
}

export function subscribeWizardDismissal(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dismissWizard(status: SetupStatus | undefined | null): void {
  const fingerprint = computeSetupFingerprint(status);
  setStorageValue(STORAGE_KEY, JSON.stringify({ fingerprint } satisfies WizardDismissalRecord));
  setSnapshot({ record: { fingerprint }, manualOpen: false });
}

export function clearWizardDismissal(): void {
  setStorageValue(STORAGE_KEY, null);
  setSnapshot({ record: null, manualOpen: snapshot.manualOpen });
}

export function openWizardManually(): void {
  setStorageValue(STORAGE_KEY, null);
  setSnapshot({ record: null, manualOpen: true });
}
