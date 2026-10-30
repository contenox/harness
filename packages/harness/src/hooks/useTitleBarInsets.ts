import { useEffect, useState } from 'react';
import { computeTitleBarInsets, type TitleBarInsets } from '../lib/titleBarInsets';

type WindowControlsOverlay = EventTarget & {
  visible: boolean;
  getTitlebarAreaRect(): DOMRect;
};

function measure(): TitleBarInsets {
  const overlay = (navigator as Navigator & { windowControlsOverlay?: WindowControlsOverlay })
    .windowControlsOverlay;
  return computeTitleBarInsets({
    platform: window.contenoxDesktop?.platform,
    overlayRect: overlay?.visible ? overlay.getTitlebarAreaRect() : null,
    innerWidth: window.innerWidth,
  });
}

/** Space the top bar reserves for native window controls (zero in the browser). */
export function useTitleBarInsets(): TitleBarInsets {
  const [insets, setInsets] = useState<TitleBarInsets>(measure);
  useEffect(() => {
    const update = () => setInsets(prev => {
      const next = measure();
      return prev.start === next.start && prev.end === next.end ? prev : next;
    });
    const overlay = (navigator as Navigator & { windowControlsOverlay?: WindowControlsOverlay })
      .windowControlsOverlay;
    window.addEventListener('resize', update);
    overlay?.addEventListener('geometrychange', update);
    return () => {
      window.removeEventListener('resize', update);
      overlay?.removeEventListener('geometrychange', update);
    };
  }, []);
  return insets;
}
