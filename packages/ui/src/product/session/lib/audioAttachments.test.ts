import { describe, expect, it } from 'vitest';
import {
  ATTACHABLE_AUDIO_TYPES,
  attachableAudioType,
  AUDIO_ACCEPT_ATTRIBUTE,
  AUDIO_PAYLOAD_BUDGET_BYTES,
  AUDIO_REQUEST_CAP_BYTES,
  AudioAttachmentError,
  canAttachAudio,
  prepareAudioAttachment,
  remainingAudioBudget,
} from './audioAttachments';
import { base64LengthForBytes, IMAGE_PAYLOAD_BUDGET_BYTES } from './imageAttachments';


function fakeFile(type: string, name = 'clip.wav', size = 1000): File {
  return { type, name, size } as File;
}

describe('canAttachAudio — PromptCapabilities gating', () => {
  it('is true ONLY for an explicit audio:true advertisement', () => {
    expect(canAttachAudio({ audio: true })).toBe(true);
  });
  it('is false for audio:false, an empty capability set, a missing one, and an image-only agent', () => {
    expect(canAttachAudio({ audio: false })).toBe(false);
    expect(canAttachAudio({})).toBe(false);
    expect(canAttachAudio(undefined)).toBe(false);
    expect(canAttachAudio({ image: true })).toBe(false);
  });
});

describe('attachableAudioType — the runtime allowlist, exactly', () => {
  it('passes the five allowlisted kinds through unchanged', () => {
    for (const t of ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/flac']) {
      expect(attachableAudioType(fakeFile(t))).toBe(t);
    }
    expect(ATTACHABLE_AUDIO_TYPES).toHaveLength(5);
  });

  it('normalises the spellings platforms actually produce to the canonical name', () => {
    expect(attachableAudioType(fakeFile('audio/x-wav'))).toBe('audio/wav');
    expect(attachableAudioType(fakeFile('audio/wave'))).toBe('audio/wav');
    expect(attachableAudioType(fakeFile('audio/mp3'))).toBe('audio/mpeg');
    expect(attachableAudioType(fakeFile('audio/x-m4a'))).toBe('audio/mp4');
    expect(attachableAudioType(fakeFile('audio/x-flac'))).toBe('audio/flac');
    expect(attachableAudioType(fakeFile('AUDIO/FLAC;charset=binary'))).toBe('audio/flac');
  });

  it('falls back to the extension ONLY when the type says nothing', () => {
    expect(attachableAudioType(fakeFile('', 'note.flac'))).toBe('audio/flac');
    expect(attachableAudioType(fakeFile('', 'note.oga'))).toBe('audio/ogg');
    expect(attachableAudioType(fakeFile('application/octet-stream', 'note.mp3'))).toBe(
      'audio/mpeg',
    );

    expect(attachableAudioType(fakeFile('video/mp4', 'note.mp4'))).toBeNull();
  });

  it('refuses everything else — including audio kinds outside the allowlist', () => {
    expect(attachableAudioType(fakeFile('audio/webm'))).toBeNull();
    expect(attachableAudioType(fakeFile('audio/aac'))).toBeNull();
    expect(attachableAudioType(fakeFile('text/plain'))).toBeNull();
    expect(attachableAudioType(fakeFile('', 'noext'))).toBeNull();
    expect(attachableAudioType(fakeFile('', 'video.webm'))).toBeNull();
  });
});

describe('AUDIO_ACCEPT_ATTRIBUTE', () => {
  it('names all five mimes and their extensions', () => {
    for (const t of ATTACHABLE_AUDIO_TYPES) expect(AUDIO_ACCEPT_ATTRIBUTE).toContain(t);
    for (const ext of ['.wav', '.mp3', '.m4a', '.ogg', '.flac']) {
      expect(AUDIO_ACCEPT_ATTRIBUTE).toContain(ext);
    }
  });
});


describe('the audio budget', () => {
  it('is bound by the relay-shaped prompt budget, far below the machine cap', () => {
    expect(AUDIO_REQUEST_CAP_BYTES).toBe(14 * 1024 * 1024);
    expect(AUDIO_PAYLOAD_BUDGET_BYTES).toBe(IMAGE_PAYLOAD_BUDGET_BYTES);
    expect(AUDIO_PAYLOAD_BUDGET_BYTES).toBeLessThan(base64LengthForBytes(AUDIO_REQUEST_CAP_BYTES));
  });

  it('shares one budget across attachments and floors at zero', () => {
    expect(remainingAudioBudget([])).toBe(AUDIO_PAYLOAD_BUDGET_BYTES);
    const half = { data: 'A'.repeat(400_000), mimeType: 'audio/wav' };
    expect(remainingAudioBudget([half])).toBeLessThan(AUDIO_PAYLOAD_BUDGET_BYTES - 400_000 + 1);
    expect(remainingAudioBudget([half, half, half])).toBe(0);
  });

  it('counts image parts the caller passes — one prompt, one socket read', () => {
    const image = { data: 'A'.repeat(500_000), mimeType: 'image/jpeg' };
    const withImage = remainingAudioBudget([image]);
    expect(withImage).toBeLessThan(remainingAudioBudget([]));
    expect(withImage).toBeGreaterThan(0);
  });
});

describe('prepareAudioAttachment — fits byte-identical, or refused; never a third outcome', () => {
  const reads: string[] = [];
  const reader = (dataUrl: string) => (file: File) => {
    reads.push(file.name);
    return Promise.resolve(dataUrl);
  };

  it('passes an allowlisted file through byte-identical under the canonical mime type', async () => {
    const attachment = await prepareAudioAttachment(
      fakeFile('audio/x-wav', 'note.wav', 6),
      { readAsDataUrl: reader('data:audio/wav;base64,dm9pY2Uh') },
    );
    expect(attachment).toMatchObject({ name: 'note.wav', mimeType: 'audio/wav', data: 'dm9pY2Uh' });
    expect(attachment.id).not.toBe('');
  });

  it('refuses a kind off the allowlist BEFORE reading the file', async () => {
    reads.length = 0;
    await expect(
      prepareAudioAttachment(fakeFile('audio/webm', 'memo.webm'), {
        readAsDataUrl: reader('data:audio/webm;base64,AAAA'),
      }),
    ).rejects.toMatchObject({ reason: 'unsupported' });
    expect(reads).toEqual([]);
  });

  it('refuses an oversized file from file.size, BEFORE reading it into memory', async () => {
    reads.length = 0;
    await expect(
      prepareAudioAttachment(fakeFile('audio/mpeg', 'podcast.mp3', 40 * 1024 * 1024), {
        readAsDataUrl: reader('data:audio/mpeg;base64,AAAA'),
      }),
    ).rejects.toMatchObject({ reason: 'too_large' });
    expect(reads).toEqual([]);
  });

  it('refuses when the budget is already spent', async () => {
    await expect(
      prepareAudioAttachment(fakeFile('audio/wav'), {
        budgetBytes: 0,
        readAsDataUrl: reader('data:audio/wav;base64,AAAA'),
      }),
    ).rejects.toBeInstanceOf(AudioAttachmentError);
  });

  it('re-measures what the reader produced — file.size refuses early but never admits', async () => {
    await expect(
      prepareAudioAttachment(fakeFile('audio/wav', 'note.wav', 3), {
        budgetBytes: 100,
        readAsDataUrl: reader(`data:audio/wav;base64,${'A'.repeat(104)}`),
      }),
    ).rejects.toMatchObject({ reason: 'too_large' });
  });

  it('reports an unreadable or malformed file as process_failed', async () => {
    await expect(
      prepareAudioAttachment(fakeFile('audio/wav'), {
        readAsDataUrl: () => Promise.reject(new Error('io')),
      }),
    ).rejects.toMatchObject({ reason: 'process_failed' });
    await expect(
      prepareAudioAttachment(fakeFile('audio/wav'), {
        readAsDataUrl: () => Promise.resolve('not a data url'),
      }),
    ).rejects.toMatchObject({ reason: 'process_failed' });
  });
});
