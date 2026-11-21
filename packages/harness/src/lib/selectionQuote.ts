import { createContext } from 'react';

export const SelectionQuote = createContext<
  ((path: string, first: number, last: number, text: string) => void) | null
>(null);
