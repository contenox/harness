import React, { ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { ThemeContext } from './themeContext';

interface ThemeProviderProps {
  children: ReactNode;
}

const darkMQ =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function subscribeToScheme(cb: () => void) {
  darkMQ?.addEventListener('change', cb);
  return () => darkMQ?.removeEventListener('change', cb);
}

function getSystemTheme(): string {
  return darkMQ?.matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemTheme = useSyncExternalStore(subscribeToScheme, getSystemTheme, () => 'light');
  const [theme, setTheme] = useState(systemTheme);

  useEffect(() => {
    setTheme(systemTheme);
  }, [systemTheme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
