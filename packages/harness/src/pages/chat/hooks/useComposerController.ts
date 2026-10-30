import { useAudioAttachments } from '@contenox/ui/session-ui';
import { useCallback, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { useFilePreview } from '../../../hooks/useFilePreview';
import type { UseWorkspaceFilesResult } from '../../../hooks/useWorkspaceFiles';
import type { AvailableCommand } from '../../../lib/acp';
import { useImageAttachments } from '../components/ComposerImageAttachments';
import { useMentionMenu } from '../components/MentionMenu';
import { useSlashCommandMenu } from '../components/SlashCommandMenu';
import { activeMentions, mentionPreviewPath, type WorkspaceFileRef } from '../lib/mentions';
import type { SubmitPayload } from '../lib/submitTurn';
import { parseTerminalPassthrough } from '../lib/terminalPassthrough';

export type ComposerFiles = Pick<UseWorkspaceFilesResult, 'cache' | 'ensureLoaded' | 'isLoading' | 'readFile'>;

export interface UseComposerControllerArgs {
  files: ComposerFiles;
  availableCommands: AvailableCommand[];
  isPrompting: boolean;
  imagesSupported: boolean;
  audioSupported: boolean;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
  onCancel: () => void;
}

/**
 * All the per-keystroke composer state (draft, caret, mentions, slash / mention menus,
 * attachments). It lives here, below the transcript, so typing never re-renders the session view.
 */
export function useComposerController({
  files,
  availableCommands,
  isPrompting,
  imagesSupported,
  audioSupported,
  onSubmit,
  onCancel,
}: UseComposerControllerArgs) {
  const [draft, setDraft] = useState('');
  const [caret, setCaret] = useState(0);
  const [mentions, setMentions] = useState<WorkspaceFileRef[]>([]);

  const imageAttachments = useImageAttachments(imagesSupported);
  const { takeImages, restoreImages } = imageAttachments;
  const audioAttachments = useAudioAttachments(audioSupported, imageAttachments.images);
  const { takeForSend: takeAudio, approveForSend: approveAudio } = audioAttachments;
  const audioClipCount = audioAttachments.clips.length;

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
  const slashMenu = useSlashCommandMenu({ draft, onDraftChange: setDraft, availableCommands });

  const previewPath = mentionMenu.open ? mentionPreviewPath(mentionMenu.entries, mentionMenu.activeIndex) : null;
  const filePreview = useFilePreview(previewPath, files.readFile);

  // `input` fires in the same event batch as the draft change, so typing costs one render, not two.
  const trackCaret = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement> | MouseEvent<HTMLTextAreaElement> | FormEvent<HTMLTextAreaElement>) => {
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
      if (slashMenu.open || mentionMenu.open) return;
      if (isPrompting) {
        if ((e.nativeEvent as SubmitEvent).submitter) onCancel();
        return;
      }
      const text = draft.trim();
      if (!text) return;

      const command = parseTerminalPassthrough(draft);
      if (command) {
        setDraft('');
        setMentions([]);
        try {
          await onSubmit({ kind: 'shell', command });
        } catch {
          setDraft(draft);
        }
        return;
      }

      if (audioClipCount > 0 && !approveAudio(text)) return;

      const turnMentions = activeMentions(draft, mentions);
      const turnImages = takeImages();
      setDraft('');
      setMentions([]);
      try {
        await onSubmit({ kind: 'prompt', text, mentions: turnMentions, images: turnImages, takeAudio });
      } catch {
        setDraft(text);
        setMentions(turnMentions);
        restoreImages(turnImages);
      }
    },
    [
      slashMenu.open,
      mentionMenu.open,
      isPrompting,
      draft,
      mentions,
      audioClipCount,
      approveAudio,
      takeImages,
      restoreImages,
      takeAudio,
      onSubmit,
      onCancel,
    ],
  );

  return {
    draft,
    setDraft,
    slashMenu,
    mentionMenu,
    filePreview,
    imageAttachments,
    audioAttachments,
    trackCaret,
    handleKeyDown,
    handleSubmit,
  };
}
