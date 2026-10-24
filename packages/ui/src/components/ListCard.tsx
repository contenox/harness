import { Card } from './Card';
import { P } from './Typography';
import { cn } from '../utils';
import type { ReactNode } from 'react';

export function ListCard({
  title,
  titleClassName = 'truncate font-medium',
  meta,
  trailing,
  muted = false,
  children,
  className,
}: {
  title: ReactNode;

  titleClassName?: string;

  meta?: ReactNode;

  trailing?: ReactNode;

  muted?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card variant="filled" className={cn('flex flex-col gap-3', muted && 'opacity-60', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <P className={titleClassName}>{title}</P>
          {meta}
        </div>
        {trailing}
      </div>
      {children}
    </Card>
  );
}
