import { P } from '@contenox/ui';

/** Quiet one-line message inside a pane ("choose a project", "no changes yet"). */
export function PaneNotice({ children }: { children: string }) {
  return (
    <P variant="muted" className="p-4 text-sm">
      {children}
    </P>
  );
}
