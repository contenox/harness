import type { SessionConfigOptionValue } from '@contenox/acp-client';
import { Dropdown, DropdownItem, IconButton } from '@contenox/ui';
import { AttachAudioButtons } from '@contenox/ui/session-ui';
import { Mic, Music, Plus, ImagePlus } from 'lucide-react';
import { memo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FOOTER_ATTACH_MENU_BELOW, footerEndLayout } from '../lib/footerLayout';
import { useParentWidth } from '../../../hooks/useParentWidth';
import type { AcpUsageState } from '../../../hooks/acpSessionState';
import type { ComposerChipOptions } from '../lib/composerChips';
import { OverflowChip, SelectChip } from './ComposerChips';
import { AttachImageButton } from './ComposerImageAttachments';
import { effectiveUsageMax } from '../lib/usageLimit';
import { UsageMeter } from './UsageMeter';

type AudioButtonProps = React.ComponentProps<typeof AttachAudioButtons>;

export interface ComposerFooterStartProps {
  /** Project chip element, built by the session view so its identity is stable while typing. */
  projectChip: ReactNode;
  imagesSupported: boolean;
  audioSupported: boolean;
  disabled: boolean;
  onImageFiles: (files: File[]) => void;
  onAudioFiles: AudioButtonProps['onFiles'];
  recording: AudioButtonProps['recording'];
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
}

/** Left side of the composer footer: project chip and attach buttons. Memoized: it never changes while typing. */
export const ComposerFooterStart = memo(function ComposerFooterStart({
  projectChip,
  imagesSupported,
  audioSupported,
  disabled,
  onImageFiles,
  onAudioFiles,
  recording,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
}: ComposerFooterStartProps) {
  const { t } = useTranslation();
  const audioLabels = {
    add: t('acp_chat.attach_audio_label'),
    record: t('acp_chat.record_audio_label'),
    stop: t('acp_chat.record_stop_label'),
    discard: t('acp_chat.record_discard_label'),
  };
  const [probe, width] = useParentWidth<HTMLSpanElement>();
  const narrow = width !== null && width > 0 && width < FOOTER_ATTACH_MENU_BELOW;
  const menuOnly = narrow && !recording && (imagesSupported || audioSupported);
  return (
    <>
      <span ref={probe} hidden aria-hidden />
      {projectChip}
      {menuOnly && (
        <AttachMenu
          imagesSupported={imagesSupported}
          audioSupported={audioSupported}
          disabled={disabled}
          onImageFiles={onImageFiles}
          onAudioFiles={onAudioFiles}
          onStartRecording={onStartRecording}
        />
      )}
      {!menuOnly && imagesSupported && <AttachImageButton onFiles={onImageFiles} disabled={disabled} />}
      {!menuOnly && audioSupported && (
        <AttachAudioButtons
          labels={audioLabels}
          onFiles={onAudioFiles}
          disabled={disabled}
          recording={recording}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onCancelRecording={onCancelRecording}
        />
      )}
    </>
  );
});

interface AttachMenuProps {
  imagesSupported: boolean;
  audioSupported: boolean;
  disabled: boolean;
  onImageFiles: (files: File[]) => void;
  onAudioFiles: AudioButtonProps['onFiles'];
  onStartRecording: () => void;
}

/** "+" menu that holds the attach actions when the footer is too narrow for separate buttons. */
function AttachMenu({
  imagesSupported,
  audioSupported,
  disabled,
  onImageFiles,
  onAudioFiles,
  onStartRecording,
}: AttachMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const pick = (files: FileList | null, cb: (f: File[]) => void) => {
    const list = Array.from(files ?? []);
    if (list.length > 0) cb(list);
  };
  return (
    <>
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="composer-image-input"
        onChange={e => {
          pick(e.currentTarget.files, onImageFiles);
          e.currentTarget.value = '';
        }}
      />
      <input
        ref={audioInput}
        type="file"
        accept="audio/*"
        multiple
        hidden
        data-testid="composer-audio-input"
        onChange={e => {
          pick(e.currentTarget.files, onAudioFiles);
          e.currentTarget.value = '';
        }}
      />
      <Dropdown
        side="top"
        isOpen={open}
        onToggle={setOpen}
        contentClassName="w-56"
        trigger={
          <IconButton
            size="sm"
            label={t('acp_chat.attach_menu_label')}
            title={t('acp_chat.attach_menu_label')}
            disabled={disabled}
            data-testid="composer-attach-menu">
            <Plus className="size-4" />
          </IconButton>
        }>
        {imagesSupported && (
          <DropdownItem
            icon={<ImagePlus />}
            onClick={() => {
              setOpen(false);
              imageInput.current?.click();
            }}>
            {t('acp_chat.attach_image_label')}
          </DropdownItem>
        )}
        {audioSupported && (
          <DropdownItem
            icon={<Music />}
            onClick={() => {
              setOpen(false);
              audioInput.current?.click();
            }}>
            {t('acp_chat.attach_audio_label')}
          </DropdownItem>
        )}
        {audioSupported && (
          <DropdownItem
            icon={<Mic />}
            onClick={() => {
              setOpen(false);
              onStartRecording();
            }}>
            {t('acp_chat.record_audio_label')}
          </DropdownItem>
        )}
      </Dropdown>
    </>
  );
}

export interface ComposerFooterEndProps {
  usage: AcpUsageState | null;
  options: ComposerChipOptions;
  onChange: (configId: string, value: SessionConfigOptionValue) => void;
}

/** Right side of the composer footer: context usage, mode / model chips, overflow. */
export const ComposerFooterEnd = memo(function ComposerFooterEnd({ usage, options, onChange }: ComposerFooterEndProps) {
  const [probe, width] = useParentWidth<HTMLSpanElement>();
  const { compactUsage: compact, chipsInOverflow, overflowOptions } = footerEndLayout(width, options);
  return (
    <>
      {/* The probe must be a sibling of the group below: it measures the footer row, not the group. */}
      <span ref={probe} hidden aria-hidden />
      <span className="ml-auto flex min-w-0 shrink items-center gap-1">
        <UsageMeter usage={usage} max={usage ? effectiveUsageMax(usage.size, options.rest) : undefined} compact={compact} />
        {!chipsInOverflow && options.mode && <SelectChip option={options.mode} onChange={onChange} />}
        {!chipsInOverflow && options.model && <SelectChip option={options.model} onChange={onChange} />}
        <OverflowChip options={overflowOptions} onChange={onChange} />
      </span>
    </>
  );
});
