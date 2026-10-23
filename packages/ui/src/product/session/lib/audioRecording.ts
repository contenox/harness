
import { base64LengthForBytes } from './imageAttachments';


export const RECORDING_SAMPLE_RATE = 16000;


export const RECORDING_BYTES_PER_SECOND = RECORDING_SAMPLE_RATE * 2;


export const WAV_HEADER_BYTES = 44;


export const RECORDING_NAME = 'Voice note';

/**
 * Longest recording (whole seconds) whose WAV fits `budgetBytes` of base64.
 */
export function maxRecordingSeconds(budgetBytes: number): number {

  const rawBudget = Math.floor(budgetBytes / 4) * 3;
  return Math.max(0, Math.floor((rawBudget - WAV_HEADER_BYTES) / RECORDING_BYTES_PER_SECOND));
}

/**
 * Base64 length `sampleCount` recorded samples become on the wire.
 */
export function recordingWireLength(sampleCount: number): number {
  return base64LengthForBytes(WAV_HEADER_BYTES + sampleCount * 2);
}

/**
 * Averages capture channels into mono; zero channels yield length 0.
 */
export function mixToMono(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0].length);
  for (const channel of channels) {
    for (let i = 0; i < out.length; i++) out[i] += channel[i] / channels.length;
  }
  return out;
}

/**
 * Linear-interpolation resample — audibly fine for speech, dependency-free.
 */
export function resampleLinear(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate || input.length === 0) return input;
  const outLength = Math.max(1, Math.round((input.length * toRate) / fromRate));
  const out = new Float32Array(outLength);
  const step = fromRate / toRate;
  for (let i = 0; i < outLength; i++) {
    const pos = i * step;
    const i0 = Math.min(input.length - 1, Math.floor(pos));
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = pos - i0;
    out[i] = input[i0] + (input[i1] - input[i0]) * frac;
  }
  return out;
}

/**
 * Float [-1, 1] → 16-bit PCM.
 */
export function floatTo16BitPcm(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return out;
}

/**
 * Mono 16-bit PCM as a complete RIFF/WAV file.
 */
export function encodeWavPcm16(samples: Int16Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(WAV_HEADER_BYTES + i * 2, samples[i], true);
  }
  return new Uint8Array(buffer);
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Standard base64, written out rather than via `btoa` so the pure pipeline has no environment seam.
 */
export function base64FromBytes(bytes: Uint8Array): string {
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out.push(
      BASE64_ALPHABET[b0 >> 2],
      BASE64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)],
      i + 1 < bytes.length ? BASE64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=',
      i + 2 < bytes.length ? BASE64_ALPHABET[b2 & 0x3f] : '=',
    );
  }
  return out.join('');
}

/**
 * A finished capture in ACP wire form.
 */
export interface FinishedRecording {
  data: string;
  mimeType: 'audio/wav';
  /**
   * Duration at the output rate, seconds (fractional).
   */
  seconds: number;
}

/**
 * Captured Float32 blocks at `sourceRate` → one WAV clip on the wire.
 */
export function finishRecording(
  chunks: readonly Float32Array[],
  sourceRate: number,
): FinishedRecording | null {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  if (total === 0) return null;
  const joined = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  const resampled = resampleLinear(joined, sourceRate, RECORDING_SAMPLE_RATE);
  const wav = encodeWavPcm16(floatTo16BitPcm(resampled), RECORDING_SAMPLE_RATE);
  return {
    data: base64FromBytes(wav),
    mimeType: 'audio/wav',
    seconds: resampled.length / RECORDING_SAMPLE_RATE,
  };
}

/**
 * `M:SS` for the elapsed/limit readout.
 */
export function formatSeconds(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}




const CAPTURE_WORKLET_SOURCE = `
registerProcessor('contenox-capture', class extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const mono = new Float32Array(input[0].length);
      for (const channel of input) {
        for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / input.length;
      }
      this.port.postMessage(mono, [mono.buffer]);
    }
    return true;
  }
});
`;

/**
 * One in-flight capture.
 */
export interface ActiveRecording {
  /**
   * Seconds captured so far, at the source rate.
   */
  elapsedSeconds(): number;
  /**
   * Stops the mic and encodes what was captured (null for an instant tap-stop).
   */
  finish(): Promise<FinishedRecording | null>;
  /**
   * Stops the mic and keeps nothing.
   */
  cancel(): void;
}

export interface StartRecordingOptions {
  /**
   * Capture STOPS here; frames past it are trimmed, never kept.
   */
  maxSeconds: number;
  /**
   * Called once when the cap (not the user) stops the capture.
   */
  onAutoStop?: () => void;
}

/**
 * Whether this browser can record at all — gates the affordance, not the failure sentence.
 */
export function canRecordAudio(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioContext !== 'undefined'
  );
}

/**
 * Asks for the microphone and starts capturing.
 */
export async function startBrowserRecording(
  options: StartRecordingOptions,
): Promise<ActiveRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const context = new AudioContext();
  const chunks: Float32Array[] = [];
  let captured = 0;
  let settled = false;
  const maxSamples = () => Math.floor(options.maxSeconds * context.sampleRate);

  const teardown = () => {
    for (const track of stream.getTracks()) track.stop();
    void context.close().catch(() => undefined);
  };

  let node: AudioWorkletNode;
  try {
    const moduleUrl = URL.createObjectURL(
      new Blob([CAPTURE_WORKLET_SOURCE], { type: 'text/javascript' }),
    );
    try {
      await context.audioWorklet.addModule(moduleUrl);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
    node = new AudioWorkletNode(context, 'contenox-capture');
  } catch (err) {
    teardown();
    throw err;
  }

  node.port.onmessage = (event: MessageEvent<Float32Array>) => {
    if (settled) return;
    const remaining = maxSamples() - captured;
    if (remaining <= 0) return;
    const frame = event.data.length <= remaining ? event.data : event.data.subarray(0, remaining);
    chunks.push(frame);
    captured += frame.length;
    if (captured >= maxSamples()) {
      settled = true;
      teardown();
      options.onAutoStop?.();
    }
  };

  context.createMediaStreamSource(stream).connect(node);

  return {
    elapsedSeconds: () => captured / context.sampleRate,
    finish: () => {
      if (!settled) {
        settled = true;
        teardown();
      }
      return Promise.resolve(finishRecording(chunks, context.sampleRate));
    },
    cancel: () => {
      if (settled) return;
      settled = true;
      teardown();
      chunks.length = 0;
    },
  };
}
