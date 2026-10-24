import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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
