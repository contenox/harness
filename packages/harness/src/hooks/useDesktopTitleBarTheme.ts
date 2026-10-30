import { useEffect } from 'react';
import { useTheme } from '../lib/ThemeProvider';

/** Keeps the native caption-button overlay in step with the renderer theme (no-op in the browser). */
export function useDesktopTitleBarTheme(): void {
  const { theme } = useTheme();
  useEffect(() => {
    window.contenoxDesktop?.setTitleBarTheme?.(theme === 'dark' ? 'dark' : 'light');
  }, [theme]);
}
