import { Button, InlineNotice } from '@contenox/ui';
import { ImagePlus, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ImageAttachmentError,
  dataTransferHasImages,
  imageFilesFromDataTransfer,
  prepareImageAttachment,
  type ImageAttachmentErrorReason,
  type PendingImageAttachment,
} from '../lib/imageAttachments';

export type ImageAttachmentNotice = 'not_supported' | ImageAttachmentErrorReason;

const NOTICE_TIMEOUT_MS = 5000;

export interface UseImageAttachmentsResult {
  images: PendingImageAttachment[];
  notice: ImageAttachmentNotice | null;
  addFiles: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  takeImages: () => PendingImageAttachment[];
  restoreImages: (images: PendingImageAttachment[]) => void;
  handlePaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  handleDrop: (e: DragEvent<HTMLElement>) => void;
  handleDragOver: (e: DragEvent<HTMLElement>) => void;
}

export function useImageAttachments(supported: boolean): UseImageAttachmentsResult {
  const [images, setImages] = useState<PendingImageAttachment[]>([]);
  const [notice, setNotice] = useState<ImageAttachmentNotice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const showNotice = useCallback((next: ImageAttachmentNotice) => {
    setNotice(next);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => {
      noticeTimer.current = null;
      setNotice(null);
    }, NOTICE_TIMEOUT_MS);
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
          const attachment = await prepareImageAttachment(file);
          setImages(prev => [...prev, attachment]);
        } catch (err) {
          showNotice(err instanceof ImageAttachmentError ? err.reason : 'process_failed');
        }
      }
    },
    [supported, showNotice],
  );

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const imagesRef = useRef(images);
  imagesRef.current = images;
  const takeImages = useCallback(() => {
    const taken = imagesRef.current;
    setImages([]);
    return taken;
  }, []);

  const restoreImages = useCallback((restored: PendingImageAttachment[]) => {
    if (restored.length === 0) return;
    setImages(prev => [...restored, ...prev]);
  }, []);

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = imageFilesFromDataTransfer(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      void addFiles(files);
    },
    [addFiles],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      const files = imageFilesFromDataTransfer(e.dataTransfer);
      if (files.length === 0) return;
      e.preventDefault();
      void addFiles(files);
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    if (dataTransferHasImages(e.dataTransfer)) e.preventDefault();
  }, []);

  return {
    images,
    notice,
    addFiles,
    removeImage,
    takeImages,
    restoreImages,
    handlePaste,
    handleDrop,
    handleDragOver,
  };
}

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
              className="border-surface-300 dark:border-dark-surface-400 h-14 w-14 rounded border object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(img.id)}
              aria-label={t('acp_chat.attachment_remove_label', { name })}
              title={t('acp_chat.attachment_remove_label', { name })}
              className="bg-surface-50 text-text border-surface-300 hover:bg-surface-100 dark:bg-dark-surface-600 dark:text-dark-text dark:border-dark-surface-400 dark:hover:bg-dark-surface-500 absolute -top-1.5 -right-1.5 rounded-full border p-1.5 shadow-sm">
              <X className="h-3.5 w-3.5" />
            </button>
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label={t('acp_chat.attach_image_label')}
        title={t('acp_chat.attach_image_tooltip')}
        onClick={() => inputRef.current?.click()}
        data-testid="composer-attach-image">
        <ImagePlus className="h-4 w-4" />
      </Button>
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
