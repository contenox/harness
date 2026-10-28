import type { PromptCapabilities } from '../../../lib/acp';

export type { PendingAudioAttachment } from '@contenox/ui/session';

export function canAttachAudio(capabilities: PromptCapabilities | undefined): boolean {
  return capabilities?.audio === true;
}
