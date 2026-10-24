import { useSyncExternalStore } from 'react';
import {
  getWizardDismissalSnapshot,
  subscribeWizardDismissal,
  type WizardDismissalSnapshot,
} from '../lib/wizardDismissal';

const SERVER_SNAPSHOT: WizardDismissalSnapshot = { record: null, manualOpen: false };

export function useWizardDismissal(): WizardDismissalSnapshot {
  return useSyncExternalStore(
    subscribeWizardDismissal,
    getWizardDismissalSnapshot,
    () => SERVER_SNAPSHOT,
  );
}
