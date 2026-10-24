import type { ReactNode } from 'react';
import { H1, P } from './Typography';

export function ScreenHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <H1 className="text-xl font-semibold sm:text-2xl">{title}</H1>
        {subtitle && (
          <P variant="muted" className="max-w-2xl text-sm">
            {subtitle}
          </P>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
