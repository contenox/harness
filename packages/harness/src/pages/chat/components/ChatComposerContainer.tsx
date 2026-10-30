import { ChatComposer } from '@contenox/ui';
import { AudioAttachmentNoticeView, ComposerAudioAttachments } from '@contenox/ui/session-ui';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AvailableCommand } from '../../../lib/acp';
import { useComposerController, type ComposerFiles } from '../hooks/useComposerController';
import type { SubmitPayload } from '../lib/submitTurn';
import { ComposerFooterStart } from './ComposerFooter';
import { ComposerImageAttachments, ImageAttachmentNoticeView } from './ComposerImageAttachments';
import { MentionMenu } from './MentionMenu';
import { SlashCommandMenu } from './SlashCommandMenu';

export interface ChatComposerContainerProps {
  files: ComposerFiles;
  availableCommands: AvailableCommand[];
  isPrompting: boolean;
  /** Composer is blocked (pending permission, or not connected). */
  disabled: boolean;
  ready: boolean;
  imagesSupported: boolean;
  audioSupported: boolean;
  projectChip: ReactNode;
  footerEnd: ReactNode;
  /** The only thing that leaves the composer: a finished turn. Rejects if it could not be sent. */
  onSubmit: (payload: SubmitPayload) => Promise<void>;
  onCancel: () => void;
}

/**
 * Owns draft, caret, mentions, slash / mention menus and attachments. Every keystroke re-renders
 * this component only; the transcript and panes above it are untouched.
 */
export function ChatComposerContainer({
  files,
  availableCommands,
  isPrompting,
  disabled,
  ready,
  imagesSupported,
  audioSupported,
  projectChip,
  footerEnd,
  onSubmit,
  onCancel,
}: ChatComposerContainerProps) {
  const { t } = useTranslation();
  const c = useComposerController({
    files,
    availableCommands,
    isPrompting,
    imagesSupported,
    audioSupported,
    onSubmit,
    onCancel,
  });
  const { imageAttachments, audioAttachments, slashMenu, mentionMenu } = c;
  const { addFiles: addImages } = imageAttachments;
  const { addFiles: addAudio, startRecording } = audioAttachments;
  const onImageFiles = useCallback((list: File[]) => void addImages(list), [addImages]);
  const onAudioFiles = useCallback((list: File[]) => void addAudio(list), [addAudio]);
  const onStartRecording = useCallback(() => void startRecording(), [startRecording]);

  const menu = slashMenu.open ? (
    <SlashCommandMenu
      entries={slashMenu.entries}
      activeIndex={slashMenu.activeIndex}
      onPick={slashMenu.pick}
      onHoverIndex={slashMenu.setActiveIndex}
    />
  ) : mentionMenu.open ? (
    <MentionMenu
      entries={mentionMenu.entries}
      scope={mentionMenu.scope}
      loading={mentionMenu.loading}
      activeIndex={mentionMenu.activeIndex}
      onPick={mentionMenu.pick}
      onHoverIndex={mentionMenu.setActiveIndex}
      preview={c.filePreview}
    />
  ) : null;

  return (
    <div
      className="relative px-3 pb-3 sm:px-4"
      onDrop={imageAttachments.handleDrop}
      onDragOver={imageAttachments.handleDragOver}>
      {menu}
      <ImageAttachmentNoticeView notice={imageAttachments.notice} />
      <AudioAttachmentNoticeView notice={audioAttachments.notice} />
      <ChatComposer
        value={c.draft}
        onChange={c.setDraft}
        onSubmit={c.handleSubmit}
        isPending={false}
        disabled={disabled}
        canSubmit={ready || isPrompting}
        allowEmptyMessage={isPrompting}
        submitLabel={isPrompting ? t('acp_chat.composer_stop') : t('acp_chat.composer_send')}
        placeholder={ready ? t('acp_chat.composer_placeholder') : t('acp_chat.composer_placeholder_connecting')}
        attachments={
          <>
            <ComposerImageAttachments images={imageAttachments.images} onRemove={imageAttachments.removeImage} />
            <ComposerAudioAttachments clips={audioAttachments.clips} onRemove={audioAttachments.removeClip} />
          </>
        }
        footerStart={
          <ComposerFooterStart
            projectChip={projectChip}
            imagesSupported={imagesSupported}
            audioSupported={audioSupported}
            disabled={disabled}
            onImageFiles={onImageFiles}
            onAudioFiles={onAudioFiles}
            recording={audioAttachments.recording}
            onStartRecording={onStartRecording}
            onStopRecording={audioAttachments.stopRecording}
            onCancelRecording={audioAttachments.cancelRecording}
          />
        }
        footerEnd={footerEnd}
        textareaProps={{
          onKeyDown: c.handleKeyDown,
          onKeyUp: c.trackCaret,
          onClick: c.trackCaret,
          onInput: c.trackCaret,
          onPaste: imageAttachments.handlePaste,
        }}
      />
    </div>
  );
}
