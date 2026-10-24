import type { ReactNode } from 'react';
import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { BarContext } from './screenBar';

export function ScreenHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  const slots = useContext(BarContext);
  if (slots === null) return null;

  return (
    <>
      {createPortal(title, slots.title)}
      {createPortal(actions ?? null, slots.actions)}
    </>
  );
}
