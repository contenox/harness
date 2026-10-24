
import type { AudioPart, PromptCapabilities } from '@contenox/acp-client';
import {
  base64LengthForBytes,
  imagePartFromDataUrl,
  IMAGE_PAYLOAD_BUDGET_BYTES,
} from './imageAttachments';


export const AUDIO_REQUEST_CAP_BYTES = 14 * 1024 * 1024;


export const AUDIO_PAYLOAD_BUDGET_BYTES = Math.min(
  base64LengthForBytes(AUDIO_REQUEST_CAP_BYTES),
  IMAGE_PAYLOAD_BUDGET_BYTES,
);


export const ATTACHABLE_AUDIO_TYPES = [
  'audio/wav',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/flac',
] as const;

const ATTACHABLE_AUDIO_TYPE_SET = new Set<string>(ATTACHABLE_AUDIO_TYPES);



const AUDIO_TYPE_ALIASES: Record<string, string> = {
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/vnd.wave': 'audio/wav',
  'audio/mp3': 'audio/mpeg',
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'audio/x-flac': 'audio/flac',
};



const AUDIO_EXTENSION_TYPES: Record<string, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  flac: 'audio/flac',
};


export const AUDIO_ACCEPT_ATTRIBUTE = [
  ...ATTACHABLE_AUDIO_TYPES,
  ...Object.keys(AUDIO_EXTENSION_TYPES).map(ext => `.${ext}`),
].join(',');

export function canAttachAudio(capabilities: PromptCapabilities | undefined): boolean {
  return capabilities?.audio === true;
}

export function attachableAudioType(file: { type: string; name: string }): string | null {
  const declared = file.type.toLowerCase().split(';')[0].trim();
  if (ATTACHABLE_AUDIO_TYPE_SET.has(declared)) return declared;
  const aliased = AUDIO_TYPE_ALIASES[declared];
  if (aliased !== undefined) return aliased;
  if (declared === '' || declared === 'application/octet-stream') {
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    return AUDIO_EXTENSION_TYPES[ext] ?? null;
  }
  return null;
}

export interface PendingAudioAttachment extends AudioPart {
  id: string;
  name: string;
}

export type AudioAttachmentErrorReason = 'unsupported' | 'too_large' | 'process_failed';

export class AudioAttachmentError extends Error {
  constructor(readonly reason: AudioAttachmentErrorReason) {
    super(`audio attachment rejected: ${reason}`);
    this.name = 'AudioAttachmentError';
  }
}


const AUDIO_BLOCK_OVERHEAD_BYTES = 96;

export function remainingAudioBudget(staged: readonly AudioPart[]): number {
  let used = 0;
  for (const part of staged) used += part.data.length + AUDIO_BLOCK_OVERHEAD_BYTES;
  return Math.max(0, AUDIO_PAYLOAD_BUDGET_BYTES - used);
}

let attachmentCounter = 0;
function nextAttachmentId(): string {
  attachmentCounter += 1;
  return `aud-${attachmentCounter}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export interface PrepareAudioOptions {
  budgetBytes?: number;
  readAsDataUrl?: (file: File) => Promise<string>;
}

export async function prepareAudioAttachment(
  file: File,
  options: PrepareAudioOptions = {},
): Promise<PendingAudioAttachment> {
  const mimeType = attachableAudioType(file);
  if (mimeType === null) throw new AudioAttachmentError('unsupported');
  const budgetBytes = options.budgetBytes ?? AUDIO_PAYLOAD_BUDGET_BYTES;
  if (budgetBytes <= 0 || base64LengthForBytes(file.size) > budgetBytes) {
    throw new AudioAttachmentError('too_large');
  }

  let part: AudioPart | null;
  try {
    part = imagePartFromDataUrl(await (options.readAsDataUrl ?? readFileAsDataUrl)(file));
  } catch {
    throw new AudioAttachmentError('process_failed');
  }
  if (part === null) throw new AudioAttachmentError('process_failed');

  if (part.data.length > budgetBytes) throw new AudioAttachmentError('too_large');
  return { id: nextAttachmentId(), name: file.name, data: part.data, mimeType };
}
