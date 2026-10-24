import { H2 } from './Typography';
import type { ReactNode } from 'react';

export function AskSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <H2 className="text-text-muted dark:text-dark-text-muted text-xs font-medium tracking-wide uppercase">
        {title}
      </H2>
      {children}
    </section>
  );
}
