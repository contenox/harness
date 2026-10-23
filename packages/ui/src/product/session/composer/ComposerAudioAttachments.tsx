import { Button } from '../../../components/Button';
import { InlineNotice } from '../../../components/InlineNotice';
import { Span } from '../../../components/Typography';
import { Mic, Music, Square, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AUDIO_ACCEPT_ATTRIBUTE,
  AudioAttachmentError,
  prepareAudioAttachment,
  remainingAudioBudget,
  type AudioAttachmentErrorReason,
  type PendingAudioAttachment,
} from '../lib/audioAttachments';
import type { ImagePart } from '@contenox/acp-client';
import { fitsPromptWireLimit } from '../lib/imageAttachments';
import {
  canRecordAudio,
  formatSeconds,
  maxRecordingSeconds,
  RECORDING_NAME,
  startBrowserRecording,
  type ActiveRecording,
} from '../lib/audioRecording';

/**
 * Audio attachments in the composer, mirroring `ComposerImageAttachments.tsx` (whose header carries the wire-budget law both strips live under).
 */

/**
 * What the transient composer notice reports.
 */
export type AudioAttachmentNotice =
  | 'not_supported'
  | 'message_too_large'
  | 'mic_unavailable'
  | 'no_room'
  | AudioAttachmentErrorReason;

const NOTICE_TIMEOUT_MS = 8000;
const RECORDING_TICK_MS = 250;

type WirePart = Pick<ImagePart, 'data' | 'mimeType'>;

/**
 * The live recording as the UI shows it.
 */
export interface RecordingReadout {
  elapsedSeconds: number;
  limitSeconds: number;
}

export interface UseAudioAttachmentsResult {
  clips: PendingAudioAttachment[];
  /**
   * Transient rejection notice, or null — render via `AudioAttachmentNoticeView`.
   */
  notice: AudioAttachmentNotice | null;
  /**
   * Validates + stages picked files (rejections surface on `notice`).
   */
  addFiles: (files: File[]) => Promise<void>;
  removeClip: (id: string) => void;
  /**
   * Measures the WHOLE message — text, carried images, clips — and answers whether the send may go on, having raised `message_too_large` when it may not.
   */
  approveForSend: (text: string) => boolean;
  /**
   * Hands the staged clips to the send path and empties the strip.
   */
  takeForSend: () => PendingAudioAttachment[];
  /**
   * Non-null while the microphone is live.
   */
  recording: RecordingReadout | null;
  startRecording: () => Promise<void>;
  /**
   * Stops the capture and stages the clip.
   */
  stopRecording: () => void;
  /**
   * Stops the capture and keeps nothing.
   */
  cancelRecording: () => void;
}

/**
 * Pending-audio state for one composer.
 */
export function useAudioAttachments(
  supported: boolean,
  carriedParts: readonly WirePart[] = [],
): UseAudioAttachmentsResult {
  const [clips, setClips] = useState<PendingAudioAttachment[]>([]);
  const [notice, setNotice] = useState<AudioAttachmentNotice | null>(null);
  const [recording, setRecording] = useState<RecordingReadout | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<ActiveRecording | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);



  const clipsRef = useRef(clips);
  clipsRef.current = clips;
  const carriedRef = useRef(carriedParts);
  carriedRef.current = carriedParts;

  const stopTick = useCallback(() => {
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);

      recorderRef.current?.cancel();
      recorderRef.current = null;
    },
    [],
  );

  const showNotice = useCallback((next: AudioAttachmentNotice) => {
    setNotice(next);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => {
      noticeTimer.current = null;
      setNotice(null);
    }, NOTICE_TIMEOUT_MS);
  }, []);

  const budgetNow = useCallback(
    () => remainingAudioBudget([...carriedRef.current, ...clipsRef.current]),
    [],
  );

  const stage = useCallback((attachment: PendingAudioAttachment) => {
    clipsRef.current = [...clipsRef.current, attachment];
    setClips(clipsRef.current);
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      if (!supported) {
        showNotice('not_supported');
        return;
      }
      for (const file of files) {
        try {
          stage(await prepareAudioAttachment(file, { budgetBytes: budgetNow() }));
        } catch (err) {
          showNotice(err instanceof AudioAttachmentError ? err.reason : 'process_failed');
        }
      }
    },
    [supported, showNotice, stage, budgetNow],
  );

  const removeClip = useCallback((id: string) => {
    setClips(prev => {
      const next = prev.filter(clip => clip.id !== id);
      clipsRef.current = next;
      return next;
    });
  }, []);

  const clearRecordingUi = useCallback(() => {
    recorderRef.current = null;
    stopTick();
    setRecording(null);
  }, [stopTick]);

  const settleRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    clearRecordingUi();
    void recorder.finish().then(finished => {
      if (!finished) return;

      if (finished.data.length > budgetNow()) {
        showNotice('too_large');
        return;
      }
      stage({
        id: `rec-${Date.now()}`,
        name: RECORDING_NAME,
        data: finished.data,
        mimeType: finished.mimeType,
      });
    });
  }, [clearRecordingUi, budgetNow, showNotice, stage]);

  const startRecording = useCallback(async () => {
    if (!supported) {
      showNotice('not_supported');
      return;
    }
    if (recorderRef.current) return;
    const limitSeconds = maxRecordingSeconds(budgetNow());
    if (limitSeconds <= 0) {
      showNotice('no_room');
      return;
    }
    try {
      const recorder = await startBrowserRecording({
        maxSeconds: limitSeconds,
        onAutoStop: () => settleRecording(),
      });
      recorderRef.current = recorder;
      setRecording({ elapsedSeconds: 0, limitSeconds });
      tickTimer.current = setInterval(() => {
        const live = recorderRef.current;
        if (live) setRecording({ elapsedSeconds: live.elapsedSeconds(), limitSeconds });
      }, RECORDING_TICK_MS);
    } catch {
      showNotice('mic_unavailable');
    }
  }, [supported, showNotice, budgetNow, settleRecording]);

  const stopRecording = useCallback(() => settleRecording(), [settleRecording]);

  const cancelRecording = useCallback(() => {
    recorderRef.current?.cancel();
    clearRecordingUi();
  }, [clearRecordingUi]);

  const approveForSend = useCallback(
    (text: string): boolean => {


      if (!fitsPromptWireLimit(text, [...carriedRef.current, ...clipsRef.current])) {
        showNotice('message_too_large');
        return false;
      }
      return true;
    },
    [showNotice],
  );

  const takeForSend = useCallback((): PendingAudioAttachment[] => {
    const staged = clipsRef.current;
    if (staged.length > 0) {
      clipsRef.current = [];
      setClips([]);
    }
    return staged;
  }, []);

  return {
    clips,
    notice,
    addFiles,
    removeClip,
    approveForSend,
    takeForSend,
    recording,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

/**
 * The staged clips as removable chips: standard `<audio controls>` preview, name, and a remove button BESIDE the chip — same sideways-scrolling row and reach rules as the image strip.
 */
export function ComposerAudioAttachments({
  clips,
  onRemove,
}: {
  clips: PendingAudioAttachment[];
  onRemove: (id: string) => void;
}) {
  if (clips.length === 0) return null;
  return (
    <ul
      aria-label="Attached audio"
      className="flex list-none gap-2 overflow-x-auto overscroll-x-contain p-0">
      {clips.map(clip => {
        const name = clip.name || RECORDING_NAME;
        return (
          <li
            key={clip.id}
            className="border-surface-300 dark:border-dark-surface-400 bg-surface-50 dark:bg-dark-surface-200 flex shrink-0 items-center gap-2 overflow-hidden rounded border pl-2">
            <Music
              className="text-text-muted dark:text-dark-text-muted h-4 w-4 shrink-0"
              aria-hidden
            />
            <div className="flex flex-col py-1">
              <Span className="max-w-40 truncate text-xs" title={name}>
                {name}
              </Span>
              <audio
                controls
                preload="metadata"
                src={`data:${clip.mimeType};base64,${clip.data}`}
                className="h-8 w-40"
                aria-label={`Play ${name}`}
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(clip.id)}
              aria-label={`Remove ${name}`}
              title={`Remove ${name}`}
              className="text-text-muted hover:bg-surface-100 hover:text-text dark:text-dark-text-muted dark:hover:bg-dark-surface-400 dark:hover:text-dark-text flex h-14 items-center justify-center self-stretch px-2">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Composer-footer audio buttons: file picker and voice-note recorder.
 */
export function AttachAudioButtons({
  onFiles,
  disabled,
  recording,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  recording: RecordingReadout | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (recording) {
    return (
      <span className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          palette="neutral"
          size="icon"
          aria-label="Stop recording and attach"
          title="Stop recording and attach"
          onClick={onStopRecording}>
          <Square className="text-error-600 dark:text-dark-error-500 h-5 w-5" aria-hidden />
        </Button>
        <Span
          className="text-text-muted dark:text-dark-text-muted text-xs tabular-nums"
          role="timer">
          {formatSeconds(recording.elapsedSeconds)} / {formatSeconds(recording.limitSeconds)}
        </Span>
        <Button
          type="button"
          variant="ghost"
          palette="neutral"
          size="icon"
          aria-label="Discard recording"
          title="Discard recording"
          onClick={onCancelRecording}>
          <X className="h-5 w-5" aria-hidden />
        </Button>
      </span>
    );
  }
  return (
    <>
      {/* sr-only, not hidden — see ImagePicker for the mobile reasons. */}
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_ACCEPT_ATTRIBUTE}
        multiple
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        data-testid="composer-audio-input"
        onChange={e => {
          const files = Array.from(e.currentTarget.files ?? []);

          e.currentTarget.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        palette="neutral"
        size="icon"
        disabled={disabled}
        aria-label="Add audio"
        title="Add audio"
        onClick={() => inputRef.current?.click()}>
        <Music className="h-5 w-5" aria-hidden />
      </Button>
      {/* The mic additionally needs a browser that can capture at all. */}
      {canRecordAudio() && (
        <Button
          type="button"
          variant="ghost"
          palette="neutral"
          size="icon"
          disabled={disabled}
          aria-label="Record a voice note"
          title="Record a voice note"
          onClick={onStartRecording}>
          <Mic className="h-5 w-5" aria-hidden />
        </Button>
      )}
    </>
  );
}



const NOTICE_TEXT: Record<AudioAttachmentNotice, string> = {
  not_supported: 'This machine’s agent does not accept audio.',
  unsupported:
    'That file is not an audio format this machine accepts — WAV, MP3, M4A, OGG, or FLAC.',
  too_large:
    'That clip is too large to send: attachments share one message of about 700 kB. Try a shorter clip or a smaller file.',
  process_failed: 'That audio file could not be read.',
  message_too_large:
    'That message is too long to send with its attachments. Shorten it, or remove one.',
  mic_unavailable:
    'The microphone is not available. Allow microphone access for this site and try again.',
  no_room:
    'This message has no room left for a recording — attachments share one message of about 700 kB. Remove one first.',
};

/**
 * The transient refusal above the composer — `role="status"`, as `ImageAttachmentNoticeView` and for its reasons.
 */
export function AudioAttachmentNoticeView({ notice }: { notice: AudioAttachmentNotice | null }) {
  if (!notice) return null;
  return (
    <InlineNotice variant="warning" role="status">
      <Span className="text-sm">{NOTICE_TEXT[notice]}</Span>
    </InlineNotice>
  );
}
