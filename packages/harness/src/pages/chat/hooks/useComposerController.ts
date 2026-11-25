import { useAudioAttachments, useSlashCommandMenu } from '@contenox/ui/session-ui';
import {
  useCallback,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useFilePreview } from '../../../hooks/useFilePreview';
import type { UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import type { AvailableCommand, SessionConfigOption } from '../../../lib/acp';
import type { PendingAudioAttachment } from '../lib/audioAttachments';
import { activeMentions, mentionPreviewPath, type WorkspaceFileRef } from '../lib/mentions';
import type { PromptPayload, SubmitPayload } from '../lib/submitTurn';
import { parseTerminalPassthrough } from '../lib/terminalPassthrough';
import { useImageAttachments } from './useImageAttachments';
import { useMentionMenu } from './useMentionMenu';

export type ComposerFiles = Pick<
  UseWorkspaceFilesResult,
  'cache' | 'ensureLoaded' | 'isLoading' | 'readFile'
>;

export interface UseComposerControllerArgs {
  files: ComposerFiles;
  availableCommands: AvailableCommand[];
  configOptions: readonly SessionConfigOption[];
  isPrompting: boolean;
  onSteer?: (payload: PromptPayload) => Promise<void>;
  imagesSupported: boolean;
  audioSupported: boolean;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
}

/**
 * All the per-keystroke composer state (draft, caret, mentions, slash / mention menus,
 * attachments). It lives here, below the transcript, so typing never re-renders the session view.
 */
export function useComposerController({
  files,
  availableCommands,
  configOptions,
  isPrompting,
  onSteer,
  imagesSupported,
  audioSupported,
  onSubmit,
}: UseComposerControllerArgs) {
  const [draft, setDraft] = useState('');
  const [caret, setCaret] = useState(0);
  const [mentions, setMentions] = useState<WorkspaceFileRef[]>([]);

  const imageAttachments = useImageAttachments(imagesSupported);
  const { takeImages, restoreImages } = imageAttachments;
  const audioAttachments = useAudioAttachments(audioSupported, imageAttachments.images);
  const {
    takeForSend: takeAudio,
    approveForSend: approveAudio,
    restoreClips: restoreAudio,
  } = audioAttachments;
  const [sendFailed, setSendFailed] = useState(false);
  const audioClipCount = audioAttachments.clips.length;
  const submitting = useRef(false);
  const hasAttachments = imageAttachments.images.length > 0 || audioClipCount > 0;
  const hasContent = !!draft.trim() || hasAttachments;
  const firstWord = draft.trimStart().split(/\s+/, 1)[0];
  const canQueue =
    !!onSteer &&
    hasContent &&
    !availableCommands.some(command => firstWord === '/' + command.name) &&
    !parseTerminalPassthrough(draft);

  const mentionMenu = useMentionMenu({
    draft,
    caret,
    cache: files.cache,
    ensureLoaded: files.ensureLoaded,
    isLoading: files.isLoading,
    onInsert: (nextDraft, nextCaret, file) => {
      setDraft(nextDraft);
      setCaret(nextCaret);
      setMentions(prev => (prev.some(m => m.path === file.path) ? prev : [...prev, file]));
    },
    onDrill: (nextDraft, nextCaret) => {
      setDraft(nextDraft);
      setCaret(nextCaret);
    },
  });
  const slashMenu = useSlashCommandMenu(draft, setDraft, availableCommands, configOptions);

  const previewPath = mentionMenu.open
    ? mentionPreviewPath(mentionMenu.entries, mentionMenu.activeIndex)
    : null;
  const filePreview = useFilePreview(previewPath, files.readFile);

  // `input` fires in the same event batch as the draft change, so typing costs one render, not two.
  const trackCaret = useCallback(
    (
      e:
        | KeyboardEvent<HTMLTextAreaElement>
        | MouseEvent<HTMLTextAreaElement>
        | FormEvent<HTMLTextAreaElement>,
    ) => {
      setCaret(e.currentTarget.selectionStart ?? 0);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      slashMenu.handleKeyDown(e);
      mentionMenu.handleKeyDown(e);
    },
    [slashMenu, mentionMenu],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (mentionMenu.open || slashMenu.acceptOnSubmit()) return;
      const text = draft.trim();
      if (!hasContent || submitting.current || (isPrompting && !canQueue)) return;
      setSendFailed(false);

      const command = parseTerminalPassthrough(draft);
      if (command) {
        setDraft('');
        setMentions([]);
        try {
          await onSubmit({ kind: 'shell', command });
        } catch {
          setDraft(draft);
          setSendFailed(true);
        }
        return;
      }

      if (hasAttachments && !approveAudio(text)) return;

      const turnMentions = activeMentions(draft, mentions);
      const turnImages = takeImages();
      setDraft('');
      setMentions([]);
      let turnAudio: PendingAudioAttachment[] = [];
      const takeTurnAudio = () => {
        turnAudio = takeAudio();
        return turnAudio;
      };
      submitting.current = true;
      try {
        const send = isPrompting && onSteer ? onSteer : onSubmit;
        await send({
          kind: 'prompt',
          text,
          mentions: turnMentions,
          images: turnImages,
          takeAudio: takeTurnAudio,
        });
      } catch {
        setDraft(current => [text, current].filter(Boolean).join('\n'));
        setMentions(current => [...turnMentions, ...current]);
        restoreImages(turnImages);
        restoreAudio(turnAudio);
        setSendFailed(true);
      } finally {
        submitting.current = false;
      }
    },
    [
      slashMenu,
      mentionMenu.open,
      isPrompting,
      canQueue,
      hasContent,
      hasAttachments,
      onSteer,
      draft,
      mentions,
      approveAudio,
      takeImages,
      restoreImages,
      takeAudio,
      restoreAudio,
      onSubmit,
    ],
  );

  return {
    draft,
    canQueue,
    hasContent,
    hasAttachments,
    setDraft,
    slashMenu,
    mentionMenu,
    filePreview,
    imageAttachments,
    audioAttachments,
    trackCaret,
    handleKeyDown,
    handleSubmit,
    sendFailed,
  };
}
