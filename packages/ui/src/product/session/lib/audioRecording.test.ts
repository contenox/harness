import { describe, expect, it } from 'vitest';
import { AUDIO_PAYLOAD_BUDGET_BYTES } from './audioAttachments';
import {
  base64FromBytes,
  encodeWavPcm16,
  finishRecording,
  floatTo16BitPcm,
  formatSeconds,
  maxRecordingSeconds,
  mixToMono,
  RECORDING_BYTES_PER_SECOND,
  RECORDING_SAMPLE_RATE,
  recordingWireLength,
  resampleLinear,
  WAV_HEADER_BYTES,
} from './audioRecording';

describe('maxRecordingSeconds — the honest cap', () => {
  it('is the longest whole-second recording whose wire form fits the budget', () => {
    const max = maxRecordingSeconds(AUDIO_PAYLOAD_BUDGET_BYTES);
    expect(recordingWireLength(max * RECORDING_SAMPLE_RATE)).toBeLessThanOrEqual(
      AUDIO_PAYLOAD_BUDGET_BYTES,
    );
    expect(recordingWireLength((max + 1) * RECORDING_SAMPLE_RATE)).toBeGreaterThan(
      AUDIO_PAYLOAD_BUDGET_BYTES,
    );
  });

  it('is tens of seconds against the relay-shaped budget — NOT the machine cap’s ~7 minutes', () => {
    const max = maxRecordingSeconds(AUDIO_PAYLOAD_BUDGET_BYTES);
    expect(max).toBeGreaterThanOrEqual(15);
    expect(max).toBeLessThan(60);
  });

  it('is zero when even one second cannot travel', () => {
    expect(maxRecordingSeconds(0)).toBe(0);
    expect(maxRecordingSeconds(RECORDING_BYTES_PER_SECOND)).toBe(0);
  });
});

describe('mixToMono', () => {
  it('averages channels', () => {
    const mono = mixToMono([new Float32Array([1, 0.5]), new Float32Array([0, -0.5])]);
    expect(Array.from(mono)).toEqual([0.5, 0]);
  });
  it('passes a single channel through and yields length 0 for none', () => {
    const one = new Float32Array([0.25]);
    expect(mixToMono([one])).toBe(one);
    expect(mixToMono([]).length).toBe(0);
  });
});

describe('resampleLinear', () => {
  it('is a no-op at equal rates', () => {
    const input = new Float32Array([0.1, 0.2]);
    expect(resampleLinear(input, 16000, 16000)).toBe(input);
  });
  it('downsamples 48 kHz to a third of the samples, preserving a constant signal', () => {
    const input = new Float32Array(4800).fill(0.5);
    const out = resampleLinear(input, 48000, 16000);
    expect(out.length).toBe(1600);
    for (const v of out) expect(v).toBeCloseTo(0.5, 6);
  });
  it('keeps a ramp monotonic and inside the source range', () => {
    const input = Float32Array.from({ length: 480 }, (_, i) => i / 479);
    const out = resampleLinear(input, 48000, 16000);
    for (let i = 1; i < out.length; i++) expect(out[i]).toBeGreaterThanOrEqual(out[i - 1]);
    expect(out[0]).toBeGreaterThanOrEqual(0);
    expect(out[out.length - 1]).toBeLessThanOrEqual(1);
  });
  it('handles empty input', () => {
    expect(resampleLinear(new Float32Array(0), 48000, 16000).length).toBe(0);
  });
});

describe('floatTo16BitPcm', () => {
  it('scales full range and CLAMPS instead of wrapping', () => {
    const out = floatTo16BitPcm(new Float32Array([0, 1, -1, 2, -3, 0.5]));
    expect(Array.from(out)).toEqual([0, 32767, -32768, 32767, -32768, 16384]);
  });
});

describe('encodeWavPcm16 — the RIFF layout, byte for byte', () => {
  it('writes a valid mono 16-bit PCM header and little-endian samples', () => {
    const wav = encodeWavPcm16(new Int16Array([1, -2, 300]), RECORDING_SAMPLE_RATE);
    const view = new DataView(wav.buffer);
    const tag = (offset: number, len: number) =>
      String.fromCharCode(...wav.subarray(offset, offset + len));

    expect(wav.length).toBe(WAV_HEADER_BYTES + 6);
    expect(tag(0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(36 + 6);
    expect(tag(8, 4)).toBe('WAVE');
    expect(tag(12, 4)).toBe('fmt ');
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(RECORDING_SAMPLE_RATE);
    expect(view.getUint32(28, true)).toBe(RECORDING_BYTES_PER_SECOND);
    expect(view.getUint16(32, true)).toBe(2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(tag(36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(6);
    expect(view.getInt16(44, true)).toBe(1);
    expect(view.getInt16(46, true)).toBe(-2);
    expect(view.getInt16(48, true)).toBe(300);
  });
});

describe('base64FromBytes', () => {
  it('matches the platform encoder across padding variants and binary data', () => {
    const cases = [
      new Uint8Array(0),
      new Uint8Array([102]),
      new Uint8Array([102, 111]),
      new Uint8Array([102, 111, 111]),
      Uint8Array.from({ length: 257 }, (_, i) => (i * 89 + 7) % 256),
    ];
    for (const bytes of cases) {
      expect(base64FromBytes(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    }
  });
});

describe('finishRecording — capture blocks to one wire clip', () => {
  it('concatenates, resamples to 16 kHz, and emits a WAV the wire form can carry', () => {
    const chunks = [new Float32Array(2400).fill(0.25), new Float32Array(2400).fill(0.25)];
    const finished = finishRecording(chunks, 48000);
    expect(finished).not.toBeNull();
    expect(finished!.mimeType).toBe('audio/wav');
    expect(finished!.seconds).toBeCloseTo(0.1, 5);
    const bytes = Buffer.from(finished!.data, 'base64');
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(bytes.length).toBe(WAV_HEADER_BYTES + 1600 * 2);
    expect(finished!.data.length).toBe(recordingWireLength(1600));
  });

  it('returns null for an empty capture', () => {
    expect(finishRecording([], 48000)).toBeNull();
    expect(finishRecording([new Float32Array(0)], 48000)).toBeNull();
  });
});

describe('formatSeconds', () => {
  it('renders M:SS, flooring fractions', () => {
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(7)).toBe('0:07');
    expect(formatSeconds(22.9)).toBe('0:22');
    expect(formatSeconds(65)).toBe('1:05');
    expect(formatSeconds(-3)).toBe('0:00');
  });
});
