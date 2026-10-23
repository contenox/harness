import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * The way back to the screen a sub-screen hangs off (an account sub-screen back to Account, an ask sub-screen back to Asks).
 */
export function BackTo({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={`Back to ${label}`}
      className="text-text-muted dark:text-dark-text-muted hover:text-text dark:hover:text-dark-text -ml-1 inline-flex min-h-11 w-fit items-center gap-1 text-sm">
      <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}
