import { describe, expect, it } from 'vitest';
import {
  base64ByteLength,
  base64LengthForBytes,
  canAttachImages,
  canPassThrough,
  dataTransferHasImages,
  encodeLadderFor,
  fitsPromptWireLimit,
  ImageAttachmentError,
  imageFilesFromDataTransfer,
  imagePartFromDataUrl,
  IMAGE_PAYLOAD_BUDGET_BYTES,
  isAttachableImageType,
  MAX_IMAGE_EDGE_PX,
  prepareImageAttachment,
  promptWireBytes,
  remainingImageBudget,
  scaledSize,
  WS_READ_LIMIT_BYTES,
  type DataTransferLike,
  type DecodedImage,
  type EncodeAttempt,
  type ImageCodec,
} from './imageAttachments';


function fakeFile(type: string, name = 'f'): File {
  return { type, name } as File;
}


function pastePayload(...types: string[]): DataTransferLike {
  return {
    items: types.map(type => ({
      kind: type === '' ? 'string' : 'file',
      type,
      getAsFile: () => (type === '' ? null : fakeFile(type)),
    })),
  };
}

describe('canAttachImages — PromptCapabilities gating', () => {
  it('is true ONLY for an explicit image:true advertisement', () => {
    expect(canAttachImages({ image: true })).toBe(true);
  });
  it('is false for image:false, an empty capability set, and a missing one', () => {
    expect(canAttachImages({ image: false })).toBe(false);
    expect(canAttachImages({})).toBe(false);
    expect(canAttachImages(undefined)).toBe(false);
  });
});

describe('isAttachableImageType', () => {
  it('accepts the browser-decodable raster formats', () => {
    for (const t of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']) {
      expect(isAttachableImageType(t)).toBe(true);
    }
  });
  it('rejects SVG (vector, flaky to rasterize) and non-images', () => {
    expect(isAttachableImageType('image/svg+xml')).toBe(false);
    expect(isAttachableImageType('text/plain')).toBe(false);
    expect(isAttachableImageType('application/pdf')).toBe(false);
  });
});

describe('imageFilesFromDataTransfer', () => {
  it('extracts image files from a paste payload (items), skipping the text component of a mixed paste', () => {
    const files = imageFilesFromDataTransfer(pastePayload('', 'image/png'));
    expect(files.map(f => f.type)).toEqual(['image/png']);
  });

  it('extracts multiple images in payload order', () => {
    const files = imageFilesFromDataTransfer(pastePayload('image/png', 'image/jpeg'));
    expect(files.map(f => f.type)).toEqual(['image/png', 'image/jpeg']);
  });

  it('falls back to `files` for drop payloads, filtering non-images', () => {
    const dt: DataTransferLike = {
      files: [fakeFile('image/webp'), fakeFile('text/plain'), fakeFile('image/png')],
    };
    expect(imageFilesFromDataTransfer(dt).map(f => f.type)).toEqual(['image/webp', 'image/png']);
  });

  it('returns [] for a plain-text payload (the composer lets the default paste run)', () => {
    expect(imageFilesFromDataTransfer(pastePayload(''))).toEqual([]);
    expect(imageFilesFromDataTransfer({ files: [fakeFile('text/plain')] })).toEqual([]);
    expect(imageFilesFromDataTransfer(null)).toEqual([]);
  });
});

describe('dataTransferHasImages — dragover acceptance (files not yet materialized)', () => {
  it('detects an image drag by item TYPE alone', () => {

    const dt = { items: [{ kind: 'file', type: 'image/png' }] };
    expect(dataTransferHasImages(dt)).toBe(true);
  });
  it('is false for text drags, non-image files, and empty payloads', () => {
    expect(dataTransferHasImages({ items: [{ kind: 'string', type: 'text/plain' }] })).toBe(false);
    expect(dataTransferHasImages({ items: [{ kind: 'file', type: 'application/pdf' }] })).toBe(
      false,
    );
    expect(dataTransferHasImages(null)).toBe(false);
  });
});

describe('base64ByteLength', () => {
  it('computes decoded sizes including padding variants', () => {
    expect(base64ByteLength('')).toBe(0);
    expect(base64ByteLength('aGVsbG8=')).toBe(5);
    expect(base64ByteLength('aGVsbG8h')).toBe(6);
    expect(base64ByteLength('aGVsbG8hIQ==')).toBe(7);
  });
});

describe('base64LengthForBytes — the inflation that makes the budget bite', () => {
  it('is the inverse of base64ByteLength, rounded up to a 4-char group', () => {
    for (const bytes of [0, 1, 2, 3, 4, 5, 1000, 999_983]) {
      expect(base64LengthForBytes(bytes)).toBeGreaterThanOrEqual(bytes);
      expect(base64LengthForBytes(bytes) % 4).toBe(0);
      expect(base64ByteLength('A'.repeat(base64LengthForBytes(bytes)))).toBeGreaterThanOrEqual(bytes);
    }
  });

  it('inflates by a third, which is why a 1 MiB read limit is not a 1 MiB photo', () => {

    expect(base64LengthForBytes(WS_READ_LIMIT_BYTES)).toBeGreaterThan(WS_READ_LIMIT_BYTES);
  });
});


describe('the wire budget', () => {
  it('mirrors wsbridge.DefaultReadLimit and reserves room for the envelope and the draft', () => {
    expect(WS_READ_LIMIT_BYTES).toBe(1_048_576);
    expect(IMAGE_PAYLOAD_BUDGET_BYTES).toBeLessThan(WS_READ_LIMIT_BYTES);

    expect(WS_READ_LIMIT_BYTES - IMAGE_PAYLOAD_BUDGET_BYTES).toBeGreaterThanOrEqual(64 * 1024);
  });

  it('counts the draft, so a long paste plus a legal image is still refused', () => {
    const image = { data: 'A'.repeat(IMAGE_PAYLOAD_BUDGET_BYTES - 1024), mimeType: 'image/jpeg' };
    expect(fitsPromptWireLimit('look at this', [image])).toBe(true);


    expect(fitsPromptWireLimit('x'.repeat(128 * 1024), [image])).toBe(false);
  });

  it('counts multibyte text as its UTF-8 size, not its character count', () => {
    const ascii = promptWireBytes('aaaa', []);
    const emoji = promptWireBytes('😀😀😀😀', []);
    expect(emoji).toBeGreaterThan(ascii);
  });

  it('shares one budget across attachments — the second photo gets what the first left', () => {
    expect(remainingImageBudget([])).toBe(IMAGE_PAYLOAD_BUDGET_BYTES);
    const half = { data: 'A'.repeat(400_000), mimeType: 'image/jpeg' };
    expect(remainingImageBudget([half])).toBeLessThan(IMAGE_PAYLOAD_BUDGET_BYTES - 400_000 + 1);
    expect(remainingImageBudget([half, half, half])).toBe(0);
  });
});

describe('imagePartFromDataUrl', () => {
  it('parses a data: URL into the ACP wire form (raw base64, no prefix)', () => {
    expect(imagePartFromDataUrl('data:image/png;base64,aGVsbG8=')).toEqual({
      mimeType: 'image/png',
      data: 'aGVsbG8=',
    });
  });
  it('returns null for non-base64 or malformed URLs', () => {
    expect(imagePartFromDataUrl('data:text/plain,hello')).toBeNull();
    expect(imagePartFromDataUrl('https://example.test/x.png')).toBeNull();
    expect(imagePartFromDataUrl('')).toBeNull();
  });
});

describe('scaledSize', () => {
  it('brings the long edge under the cap and never upscales', () => {
    expect(scaledSize(4032, 3024, 1568)).toEqual({ width: 1568, height: 1176 });
    expect(scaledSize(600, 400, 1568)).toEqual({ width: 600, height: 400 });
  });
  it('never rounds a thin image to zero pixels', () => {
    expect(scaledSize(4000, 3, 560)).toEqual({ width: 560, height: 1 });
  });
});

describe('encodeLadderFor', () => {
  it('starts at the long-edge cap and only ever goes smaller', () => {
    const rungs = encodeLadderFor('image/jpeg');
    expect(rungs[0].maxEdgePx).toBe(MAX_IMAGE_EDGE_PX);
    for (let i = 1; i < rungs.length; i++) {
      expect(rungs[i].maxEdgePx).toBeLessThan(rungs[i - 1].maxEdgePx);
    }
  });
  it('gives a PNG one lossless rung, then flattens to JPEG rather than refusing', () => {
    const rungs = encodeLadderFor('image/png');
    expect(rungs[0].mimeType).toBe('image/png');
    expect(rungs.slice(1).every(r => r.mimeType === 'image/jpeg')).toBe(true);
  });
});

describe('canPassThrough', () => {
  it('lets a small screenshot travel untouched', () => {
    expect(canPassThrough({ type: 'image/png', size: 40_000 }, 900, 600, 900_000)).toBe(true);
  });
  it('refuses a file whose BASE64 busts the budget even though the file does not', () => {



    expect(canPassThrough({ type: 'image/jpeg', size: 800_000 }, 1200, 900, 950_272)).toBe(false);
  });
  it('refuses an oversized canvas and a format the agent may not take', () => {
    expect(canPassThrough({ type: 'image/png', size: 1000 }, 4032, 3024, 900_000)).toBe(false);
    expect(canPassThrough({ type: 'image/webp', size: 1000 }, 900, 600, 900_000)).toBe(false);
  });
});


function codecFor(
  source: { width: number; height: number; fileDataUrl?: string },
  bytesFor: (attempt: EncodeAttempt, width: number, height: number) => number,
): { codec: ImageCodec; encoded: EncodeAttempt[]; closed: () => number } {
  const encoded: EncodeAttempt[] = [];
  let closes = 0;
  const decoded: DecodedImage = {
    width: source.width,
    height: source.height,
    close: () => {
      closes += 1;
    },
  };
  return {
    encoded,
    closed: () => closes,
    codec: {
      decode: () => Promise.resolve(decoded),
      encode: (_image, width, height, attempt) => {
        encoded.push(attempt);
        const chars = Math.ceil(bytesFor(attempt, width, height) / 4) * 4;
        return `data:${attempt.mimeType};base64,${'A'.repeat(chars)}`;
      },
      readAsDataUrl: () =>
        Promise.resolve(source.fileDataUrl ?? 'data:image/png;base64,c21hbGw='),
    },
  };
}

function photo(type = 'image/jpeg', size = 8 * 1024 * 1024): File {
  return { type, name: 'IMG_0042.jpg', size } as File;
}


describe('prepareImageAttachment — an oversized source is shrunk or refused, never sent whole', () => {
  it('shrinks a 12 MP photograph to something the read limit can carry', async () => {

    const { codec, encoded } = codecFor({ width: 4032, height: 3024 }, (attempt, w, h) =>
      Math.round(w * h * (attempt.quality ?? 1) * 0.12),
    );

    const attachment = await prepareImageAttachment(photo(), { codec });

    expect(attachment.data.length).toBeLessThanOrEqual(IMAGE_PAYLOAD_BUDGET_BYTES);
    expect(fitsPromptWireLimit('what is wrong here?', [attachment])).toBe(true);

    expect(base64ByteLength(attachment.data)).toBeLessThan(photo().size);
    expect(encoded.length).toBeGreaterThan(0);
    expect(encoded[0].maxEdgePx).toBe(MAX_IMAGE_EDGE_PX);
  });

  it('walks DOWN the ladder until one rung fits, and stops there', async () => {

    const { codec, encoded } = codecFor({ width: 4032, height: 3024 }, (attempt, w, h) =>
      w * h > 800 * 800 ? 4_000_000 : 300_000,
    );

    const attachment = await prepareImageAttachment(photo(), { codec });

    expect(attachment.data.length).toBeLessThanOrEqual(IMAGE_PAYLOAD_BUDGET_BYTES);
    expect(encoded.map(a => a.maxEdgePx)).toEqual([MAX_IMAGE_EDGE_PX, 1120, 800]);
  });

  it('REFUSES when even the smallest rung busts the budget — it never falls back to the original', async () => {
    const { codec, encoded } = codecFor({ width: 4032, height: 3024 }, () => 4_000_000);

    await expect(prepareImageAttachment(photo(), { codec })).rejects.toMatchObject({
      reason: 'too_large',
    });

    expect(encoded.length).toBe(encodeLadderFor('image/jpeg').length);
  });

  it('refuses immediately once the earlier attachments have spent the budget', async () => {
    const { codec, encoded } = codecFor({ width: 900, height: 600 }, () => 1000);
    await expect(prepareImageAttachment(photo(), { codec, budgetBytes: 0 })).rejects.toBeInstanceOf(
      ImageAttachmentError,
    );
    expect(encoded).toEqual([]);
  });

  it('passes a small screenshot through byte-identical rather than re-encoding it', async () => {
    const { codec, encoded } = codecFor(
      { width: 900, height: 600, fileDataUrl: 'data:image/png;base64,c2NyZWVuc2hvdA==' },
      () => 1000,
    );

    const attachment = await prepareImageAttachment(
      { type: 'image/png', name: 'shot.png', size: 40_000 } as File,
      { codec },
    );

    expect(attachment).toMatchObject({ mimeType: 'image/png', data: 'c2NyZWVuc2hvdA==' });
    expect(encoded).toEqual([]);
  });

  it('re-encodes rather than passing through when the file is small on disk and big base64', async () => {


    const { codec, encoded } = codecFor(
      { width: 1200, height: 900, fileDataUrl: `data:image/jpeg;base64,${'A'.repeat(1_066_668)}` },
      () => 200_000,
    );

    const attachment = await prepareImageAttachment(
      { type: 'image/jpeg', name: 'big.jpg', size: 800_000 } as File,
      { codec },
    );

    expect(attachment.data.length).toBeLessThanOrEqual(IMAGE_PAYLOAD_BUDGET_BYTES);
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('rejects a format the pipeline cannot decode, before touching the codec', async () => {
    const { codec, encoded } = codecFor({ width: 10, height: 10 }, () => 10);
    await expect(
      prepareImageAttachment({ type: 'image/svg+xml', name: 'logo.svg', size: 10 } as File, {
        codec,
      }),
    ).rejects.toMatchObject({ reason: 'unsupported' });
    expect(encoded).toEqual([]);
  });

  it('reports a decode failure as process_failed rather than throwing something raw', async () => {
    const codec: ImageCodec = {
      decode: () => Promise.reject(new Error('corrupt')),
      encode: () => '',
      readAsDataUrl: () => Promise.resolve(''),
    };
    await expect(prepareImageAttachment(photo(), { codec })).rejects.toMatchObject({
      reason: 'process_failed',
    });
  });

  it('releases the decoded bitmap on every path, including the refusal', async () => {
    const big = codecFor({ width: 4032, height: 3024 }, () => 4_000_000);
    await expect(prepareImageAttachment(photo(), { codec: big.codec })).rejects.toBeInstanceOf(
      ImageAttachmentError,
    );
    expect(big.closed()).toBe(1);

    const ok = codecFor({ width: 4032, height: 3024 }, () => 1000);
    await prepareImageAttachment(photo(), { codec: ok.codec });
    expect(ok.closed()).toBe(1);
  });
});
