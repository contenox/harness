import { Link } from 'react-router-dom';
import { useProductPorts } from '../ports';

/**
 * § 5 DDG requires the imprint to be reachable from every page, so this sits in the shell and on every signed-out screen rather than behind the account menu.
 */
export function LegalLinks() {
  const { routes } = useProductPorts();
  const links = [
    { to: routes.legalImprint, label: 'Imprint' },
    { to: routes.legalTerms, label: 'Terms' },
    { to: routes.legalPrivacy, label: 'Privacy' },
    { to: routes.legalWithdrawal, label: 'Withdrawal' },
  ] as const;
  return (
    <nav
      aria-label="Legal"
      className="text-text-muted dark:text-dark-text-muted shrink-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-xs [@media(max-height:500px)]:gap-x-2 [@media(max-height:500px)]:py-0.5">
      {links.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
          {label}
        </Link>
      ))}
    </nav>
  );
}
