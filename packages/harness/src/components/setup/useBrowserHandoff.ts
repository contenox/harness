import { copyTextToClipboard } from '@contenox/ui';
import { useEffect, useState } from 'react';

const HANDED_OFF_KEY = 'contenox_signin_handed_off_code';

function alreadyHandedOff(code: string): boolean {
  try {
    return sessionStorage.getItem(HANDED_OFF_KEY) === code;
  } catch {
    return false;
  }
}

function rememberHandOff(code: string): void {
  try {
    sessionStorage.setItem(HANDED_OFF_KEY, code);
  } catch {
    // Storage may be unavailable; worst case the page opens once more.
  }
}

/** Forget the last hand-off so the next attempt opens the browser again. */
export function clearBrowserHandoff(): void {
  try {
    sessionStorage.removeItem(HANDED_OFF_KEY);
  } catch {
    // Storage may be unavailable; nothing to clear.
  }
}

/**
 * When a device code arrives, open the sign-in page in the system browser and put the code on
 * the clipboard, once per code (a reload does not reopen the browser). Returns whether the code
 * is on the clipboard.
 */
export function useBrowserHandoff(url: string | undefined, code: string | undefined): boolean {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
    if (!url || !code || alreadyHandedOff(code)) return;
    rememberHandOff(code);
    // In the desktop app window.open is routed to the system browser.
    window.open(url, '_blank', 'noopener,noreferrer');
    void copyTextToClipboard(code).then(setCopied);
  }, [url, code]);

  return copied;
}
