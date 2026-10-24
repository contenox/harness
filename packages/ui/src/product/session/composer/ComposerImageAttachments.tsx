import { Button } from '../../../components/Button';
import { InlineNotice } from '../../../components/InlineNotice';
import { Span } from '../../../components/Typography';
import { Camera, ImagePlus, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import {
  fitsPromptWireLimit,
  ImageAttachmentError,
  dataTransferHasImages,
  imageFilesFromDataTransfer,
  prepareImageAttachment,
  remainingImageBudget,
  type ImageAttachmentErrorReason,
  type PendingImageAttachment,
} from '../lib/imageAttachments';


export type ImageAttachmentNotice = 'not_supported' | 'message_too_large' | ImageAttachmentErrorReason;


const NOTICE_TIMEOUT_MS = 8000;


const UNNAMED_IMAGE = 'Photo';

export interface UseImageAttachmentsResult {
  images: PendingImageAttachment[];
  notice: ImageAttachmentNotice | null;
  addFiles: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  approveForSend: (text: string) => boolean;
  takeForSend: () => PendingImageAttachment[];
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




  const imagesRef = useRef(images);
  imagesRef.current = images;

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      if (!supported) {
        showNotice('not_supported');
        return;
      }
      for (const file of files) {
        try {




          const attachment = await prepareImageAttachment(file, {
            budgetBytes: remainingImageBudget(imagesRef.current),
          });
          imagesRef.current = [...imagesRef.current, attachment];
          setImages(imagesRef.current);
        } catch (err) {
          showNotice(err instanceof ImageAttachmentError ? err.reason : 'process_failed');
        }
      }
    },
    [supported, showNotice],
  );

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const next = prev.filter(img => img.id !== id);
      imagesRef.current = next;
      return next;
    });
  }, []);

  const approveForSend = useCallback(
    (text: string): boolean => {
      const staged = imagesRef.current;



      if (staged.length === 0) return true;


      if (!fitsPromptWireLimit(text, staged)) {
        showNotice('message_too_large');
        return false;
      }
      return true;
    },
    [showNotice],
  );

  const takeForSend = useCallback((): PendingImageAttachment[] => {
    const staged = imagesRef.current;
    if (staged.length > 0) {
      imagesRef.current = [];
      setImages([]);
    }
    return staged;
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
    approveForSend,
    takeForSend,
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
  if (images.length === 0) return null;
  return (
    <ul
      aria-label="Attached images"
      className="flex list-none gap-2 overflow-x-auto overscroll-x-contain p-0">
      {images.map(img => {
        const name = img.name || UNNAMED_IMAGE;
        return (
          <li
            key={img.id}
            className="border-surface-300 dark:border-dark-surface-400 bg-surface-50 dark:bg-dark-surface-200 flex shrink-0 items-center overflow-hidden rounded border">
            <img
              src={`data:${img.mimeType};base64,${img.data}`}
              alt={name}
              title={name}
              className="h-14 w-14 object-cover"
            />

            <button
              type="button"
              onClick={() => onRemove(img.id)}
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


function ImagePicker({
  label,
  icon,
  capture,
  disabled,
  onFiles,
}: {
  label: string;
  icon: ReactNode;

  capture?: 'environment';
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        multiple={capture === undefined}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        data-testid={capture === undefined ? 'composer-image-input' : 'composer-camera-input'}
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
        aria-label={label}
        title={label}
        onClick={() => inputRef.current?.click()}>
        {icon}
      </Button>
    </>
  );
}

export function AttachImageButtons({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <ImagePicker
        label="Take a photo"
        icon={<Camera className="h-5 w-5" aria-hidden />}
        capture="environment"
        disabled={disabled}
        onFiles={onFiles}
      />
      <ImagePicker
        label="Add a photo"
        icon={<ImagePlus className="h-5 w-5" aria-hidden />}
        disabled={disabled}
        onFiles={onFiles}
      />
    </>
  );
}


const NOTICE_TEXT: Record<ImageAttachmentNotice, string> = {
  not_supported: 'This machine’s agent does not accept images.',
  unsupported: 'That file is not an image this app can send.',
  too_large:
    'That picture is too large to send, even shrunk as far as it goes. Try a screenshot or a smaller photo.',
  process_failed: 'That image could not be read.',
  message_too_large:
    'That message is too long to send with a picture attached. Shorten it, or remove the picture.',
};

export function ImageAttachmentNoticeView({ notice }: { notice: ImageAttachmentNotice | null }) {
  if (!notice) return null;
  return (
    <InlineNotice variant="warning" role="status">
      <Span className="text-sm">{NOTICE_TEXT[notice]}</Span>
    </InlineNotice>
  );
}
