import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from 'react';
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
