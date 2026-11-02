import type { TranslationKey } from '../i18n';
import type { FleetInstanceState, InstanceStatus } from './types';

const LIVE_STATES: FleetInstanceState[] = ['running', 'starting'];

export function stopConfirmCopy(
  state: FleetInstanceState,
  finished = false,
): {
  title: TranslationKey;
  body: TranslationKey;
  confirm: TranslationKey;
} {
  if (finished) {
    return {
      title: 'fleet.release_confirm_title',
      body: 'fleet.release_confirm_body',
      confirm: 'fleet.release_confirm_confirm',
    };
  }
  return LIVE_STATES.includes(state)
    ? {
        title: 'fleet.stop_confirm_title',
        body: 'fleet.stop_confirm_body',
        confirm: 'fleet.stop_confirm_confirm',
      }
    : {
        title: 'fleet.stop_confirm_title_dead',
        body: 'fleet.stop_confirm_body_dead',
        confirm: 'fleet.stop_confirm_confirm_dead',
      };
}

export function createStopFlow(
  stop: (instanceId: string) => void,
  setTarget: (instance: InstanceStatus | null) => void,
) {
  return {
    request: (instance: InstanceStatus) => setTarget(instance),
    confirm: (instance: InstanceStatus) => {
      stop(instance.id);
      setTarget(null);
    },
    dismiss: () => setTarget(null),
  };
}
