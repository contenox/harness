
import type { ImagePart, PromptCapabilities } from '@contenox/acp-client';


export const WS_READ_LIMIT_BYTES = 1 << 20;


export const PROMPT_ENVELOPE_RESERVE_BYTES = 96 * 1024;


export const IMAGE_PAYLOAD_BUDGET_BYTES = WS_READ_LIMIT_BYTES - PROMPT_ENVELOPE_RESERVE_BYTES;


export const MAX_IMAGE_EDGE_PX = 1568;


const ATTACHABLE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

export function canAttachImages(capabilities: PromptCapabilities | undefined): boolean {
  return capabilities?.image === true;
}

export function isAttachableImageType(mimeType: string): boolean {
  return ATTACHABLE_IMAGE_TYPES.has(mimeType);
}

export interface PendingImageAttachment extends ImagePart {
  id: string;
  name: string;
}

export type ImageAttachmentErrorReason = 'unsupported' | 'too_large' | 'process_failed';

export class ImageAttachmentError extends Error {
  constructor(readonly reason: ImageAttachmentErrorReason) {
    super(`image attachment rejected: ${reason}`);
    this.name = 'ImageAttachmentError';
  }
}

export interface DataTransferLike {
  items?: ArrayLike<{ kind: string; type: string; getAsFile(): File | null }>;
  files?: ArrayLike<File>;
}

export function imageFilesFromDataTransfer(dt: DataTransferLike | null | undefined): File[] {
  if (!dt) return [];
  const out: File[] = [];
  if (dt.items && dt.items.length > 0) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind !== 'file' || !isAttachableImageType(item.type)) continue;
      const file = item.getAsFile();
      if (file) out.push(file);
    }
    if (out.length > 0) return out;
  }
  if (dt.files) {
    for (let i = 0; i < dt.files.length; i++) {
      const file = dt.files[i];
      if (isAttachableImageType(file.type)) out.push(file);
    }
  }
  return out;
}

export function dataTransferHasImages(
  dt: { items?: ArrayLike<{ kind: string; type: string }> } | null | undefined,
): boolean {
  if (!dt?.items) return false;
  for (let i = 0; i < dt.items.length; i++) {
    const item = dt.items[i];
    if (item.kind === 'file' && isAttachableImageType(item.type)) return true;
  }
  return false;
}

export function base64ByteLength(b64: string): number {
  if (b64 === '') return 0;
  let padding = 0;
  if (b64.endsWith('==')) padding = 2;
  else if (b64.endsWith('=')) padding = 1;
  return (b64.length * 3) / 4 - padding;
}

export function base64LengthForBytes(bytes: number): number {
  return Math.ceil(bytes / 3) * 4;
}


function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}


const IMAGE_BLOCK_OVERHEAD_BYTES = 96;


const JSON_RPC_SCAFFOLD_BYTES = 256;

export function promptWireBytes(text: string, images: readonly ImagePart[]): number {
  let total = JSON_RPC_SCAFFOLD_BYTES + utf8Bytes(text);
  for (const image of images) {
    total += image.data.length + image.mimeType.length + IMAGE_BLOCK_OVERHEAD_BYTES;
  }
  return total;
}

export function fitsPromptWireLimit(text: string, images: readonly ImagePart[]): boolean {
  return promptWireBytes(text, images) <= WS_READ_LIMIT_BYTES;
}

export function remainingImageBudget(images: readonly ImagePart[]): number {
  let used = 0;
  for (const image of images) used += image.data.length + IMAGE_BLOCK_OVERHEAD_BYTES;
  return Math.max(0, IMAGE_PAYLOAD_BUDGET_BYTES - used);
}

export function imagePartFromDataUrl(dataUrl: string): ImagePart | null {
  const m = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

export interface EncodeAttempt {
  maxEdgePx: number;
  mimeType: 'image/png' | 'image/jpeg';
  quality?: number;
}

export function encodeLadderFor(sourceType: string): EncodeAttempt[] {
  const jpeg: EncodeAttempt[] = [
    { maxEdgePx: MAX_IMAGE_EDGE_PX, mimeType: 'image/jpeg', quality: 0.85 },
    { maxEdgePx: 1120, mimeType: 'image/jpeg', quality: 0.8 },
    { maxEdgePx: 800, mimeType: 'image/jpeg', quality: 0.7 },
    { maxEdgePx: 560, mimeType: 'image/jpeg', quality: 0.6 },
  ];
  if (sourceType !== 'image/png') return jpeg;
  return [{ maxEdgePx: MAX_IMAGE_EDGE_PX, mimeType: 'image/png' }, ...jpeg];
}

export function scaledSize(
  width: number,
  height: number,
  maxEdgePx: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdgePx / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function canPassThrough(
  file: { type: string; size: number },
  width: number,
  height: number,
  budgetBytes: number,
): boolean {
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') return false;
  if (Math.max(width, height) > MAX_IMAGE_EDGE_PX) return false;
  return base64LengthForBytes(file.size) <= budgetBytes;
}

export interface DecodedImage {
  width: number;
  height: number;
  source?: unknown;
  close(): void;
}

export interface ImageCodec {
  decode(file: File): Promise<DecodedImage>;
  encode(image: DecodedImage, width: number, height: number, attempt: EncodeAttempt): string;
  readAsDataUrl(file: File): Promise<string>;
}


function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}


export const browserImageCodec: ImageCodec = {
  async decode(file) {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      close: () => bitmap.close(),
    };
  },
  encode(image, width, height, attempt) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageAttachmentError('process_failed');


    if (attempt.mimeType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image.source as CanvasImageSource, 0, 0, width, height);
    return canvas.toDataURL(attempt.mimeType, attempt.quality);
  },
  readAsDataUrl: readFileAsDataUrl,
};

let attachmentCounter = 0;

function nextAttachmentId(): string {
  attachmentCounter += 1;
  return `img-${attachmentCounter}`;
}

export interface PrepareImageOptions {
  budgetBytes?: number;
  codec?: ImageCodec;
}

export async function prepareImageAttachment(
  file: File,
  options: PrepareImageOptions = {},
): Promise<PendingImageAttachment> {
  if (!isAttachableImageType(file.type)) throw new ImageAttachmentError('unsupported');
  const budgetBytes = options.budgetBytes ?? IMAGE_PAYLOAD_BUDGET_BYTES;
  const codec = options.codec ?? browserImageCodec;
  if (budgetBytes <= 0) throw new ImageAttachmentError('too_large');

  let image: DecodedImage;
  try {
    image = await codec.decode(file);
  } catch {
    throw new ImageAttachmentError('process_failed');
  }

  try {
    if (canPassThrough(file, image.width, image.height, budgetBytes)) {
      const part = imagePartFromDataUrl(await codec.readAsDataUrl(file));



      if (part && part.data.length <= budgetBytes) {
        return { id: nextAttachmentId(), name: file.name, ...part };
      }
    }

    for (const attempt of encodeLadderFor(file.type)) {
      const { width, height } = scaledSize(image.width, image.height, attempt.maxEdgePx);
      let part: ImagePart | null;
      try {
        part = imagePartFromDataUrl(codec.encode(image, width, height, attempt));
      } catch {
        throw new ImageAttachmentError('process_failed');
      }
      if (part && part.data.length <= budgetBytes) {
        return { id: nextAttachmentId(), name: file.name, ...part };
      }
    }
    throw new ImageAttachmentError('too_large');
  } finally {
    image.close();
  }
}
