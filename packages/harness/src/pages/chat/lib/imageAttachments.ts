import type { ImagePart, PromptCapabilities } from '../../../lib/acp';

export const MAX_IMAGE_EDGE_PX = 1568;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

export function imagePartFromDataUrl(dataUrl: string): ImagePart | null {
  const m = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

let attachmentCounter = 0;
function nextAttachmentId(): string {
  attachmentCounter += 1;
  return `img-${attachmentCounter}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export async function prepareImageAttachment(file: File): Promise<PendingImageAttachment> {
  if (!isAttachableImageType(file.type)) throw new ImageAttachmentError('unsupported');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageAttachmentError('process_failed');
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const isPassthroughType = file.type === 'image/png' || file.type === 'image/jpeg';
    if (scale === 1 && isPassthroughType && file.size <= MAX_IMAGE_BYTES) {
      const part = imagePartFromDataUrl(await readFileAsDataUrl(file));
      if (!part) throw new ImageAttachmentError('process_failed');
      return { id: nextAttachmentId(), name: file.name, ...part };
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageAttachmentError('process_failed');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const attempts: Array<() => string> =
      file.type === 'image/png'
        ? [
            () => canvas.toDataURL('image/png'),
            () => canvas.toDataURL('image/jpeg', 0.9),
            () => canvas.toDataURL('image/jpeg', 0.8),
          ]
        : [() => canvas.toDataURL('image/jpeg', 0.9), () => canvas.toDataURL('image/jpeg', 0.8)];
    for (const attempt of attempts) {
      const part = imagePartFromDataUrl(attempt());
      if (part && base64ByteLength(part.data) <= MAX_IMAGE_BYTES) {
        return { id: nextAttachmentId(), name: file.name, ...part };
      }
    }
    throw new ImageAttachmentError('too_large');
  } finally {
    bitmap.close();
  }
}
