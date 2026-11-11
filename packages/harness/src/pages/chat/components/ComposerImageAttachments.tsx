import { IconButton, InlineNotice } from '@contenox/ui';
import { ImagePlus, X } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageAttachmentNotice } from '../hooks/useImageAttachments';
import { type PendingImageAttachment } from '../lib/imageAttachments';

export function ComposerImageAttachments({
  images,
  onRemove,
}: {
  images: PendingImageAttachment[];
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="composer-image-attachments">
      {images.map(img => {
        const name = img.name || t('acp_chat.image_attachment_fallback_name');
        return (
          <div key={img.id} className="relative" data-testid="composer-image-attachment">
            <img
              src={`data:${img.mimeType};base64,${img.data}`}
              alt={name}
              title={name}
              className="border-line size-14 rounded border object-cover"
            />
            <IconButton
              size="xs"
              variant="outline"
              type="button"
              label={t('acp_chat.attachment_remove_label', { name })}
              noTooltip
              onClick={() => onRemove(img.id)}
              className="bg-raised absolute -top-1.5 -right-1.5 rounded-full">
              <X className="size-3" />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}

export function AttachImageButton({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="composer-image-input"
        onChange={e => {
          const files = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
      <IconButton
        size="sm"
        type="button"
        label={t('acp_chat.attach_image_label')}
        title={t('acp_chat.attach_image_tooltip')}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        data-testid="composer-attach-image">
        <ImagePlus className="size-4" />
      </IconButton>
    </>
  );
}

export function ImageAttachmentNoticeView({ notice }: { notice: ImageAttachmentNotice | null }) {
  const { t } = useTranslation();
  if (!notice) return null;
  const text =
    notice === 'not_supported'
      ? t('acp_chat.image_not_supported_notice')
      : notice === 'too_large'
        ? t('acp_chat.image_too_large_notice')
        : t('acp_chat.image_prepare_failed_notice');
  return (
    <InlineNotice
      variant="warning"
      className="mb-2 rounded-md border"
      data-testid="composer-image-notice">
      {text}
    </InlineNotice>
  );
}
