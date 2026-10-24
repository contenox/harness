import { cn } from '../utils';
import type { ReactNode } from 'react';

export function ScreenBody({
  children,
  width = 'full',
  padded = true,
  className,
}: {
  children: ReactNode;

  width?: 'full' | 'narrow' | 'band';

  padded?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 short:gap-3',
        width === 'narrow' ? 'mx-auto w-full max-w-2xl' : '',
        width === 'band' ? 'mx-auto w-full max-w-5xl' : '',
        padded ? 'p-4 short:p-3' : '',
        className,
      )}>
      {children}
    </div>
  );
}
