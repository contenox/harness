import type { ReactNode } from 'react';
import { BackButton } from './BackButton';
import { cn } from '../utils';

/**
 * DetailLayout switches a list-detail surface between stacked and split layouts.
 */
export function DetailLayout({
  children,
  detail,
  open,
  onClose,
  backLabel,
}: {
  children: ReactNode;
  detail: ReactNode;
  open: boolean;
  onClose: () => void;
  backLabel: string;
}) {
  return (
    <div className={cn('grid min-w-0 items-start gap-6', open && 'lg:grid-cols-2')}>
      <div className={cn('min-w-0', open && 'hidden lg:block')}>{children}</div>
      <div className={cn('min-w-0 space-y-4', !open && 'hidden')}>
        <BackButton label={backLabel} onClick={onClose} />
        {detail}
      </div>
    </div>
  );
}
