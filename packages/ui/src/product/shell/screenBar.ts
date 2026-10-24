import { createContext } from 'react';

export interface BarSlots {
  title: HTMLElement;
  actions: HTMLElement;
}

export const BarContext = createContext<BarSlots | null>(null);
