import { createContext } from 'react';

/**
 * The two places a page can put its chrome inside the shell's bar.
 */
export interface BarSlots {
  /**
   * The bar's `<h1>` — the page's title text lands inside it.
   */
  title: HTMLElement;
  /**
   * The right-hand cluster holding the page's actions.
   */
  actions: HTMLElement;
}

export const BarContext = createContext<BarSlots | null>(null);
