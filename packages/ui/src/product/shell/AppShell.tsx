import { Button } from '../../components/Button';
import { NavItem } from '../../components/NavItem';
import { cn } from '../../utils';
import { CreditCard, Inbox, Menu, MessageSquare, Server, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProductPorts } from '../ports';
import { AccountSwitcher } from './AccountSwitcher';
import { BillingBanner } from './BillingBanner';
import { BarContext, type BarSlots } from './screenBar';

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const [slots, setSlots] = useState<BarSlots | null>(null);



  useLayoutEffect(() => {
    if (titleRef.current === null || actionsRef.current === null) {
      return;
    }
    setSlots({
      title: titleRef.current,
      actions: actionsRef.current,
    });
  }, []);


  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <BarContext.Provider value={slots}>
      <div className="bg-surface-100 dark:bg-dark-surface-100 flex h-full min-h-0 flex-col">
        <header className="border-surface-300 bg-surface-50 dark:border-dark-surface-600 dark:bg-dark-surface-50 z-40 flex h-12 shrink-0 items-center gap-1 border-b px-1 sm:px-2">

          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 sm:hidden"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            onClick={() => setOpen(value => !value)}>
            {open ? (
              <X className="h-6 w-6" aria-hidden />
            ) : (
              <Menu className="h-6 w-6" aria-hidden />
            )}
          </Button>


          <h1
            ref={titleRef}
            className="text-text dark:text-dark-text min-w-0 flex-1 truncate text-base font-semibold sm:text-lg"
          />

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">

            <span ref={actionsRef} className="flex shrink-0 items-center gap-1 sm:gap-2" />

            <nav
              aria-label="Primary"
              className="hidden items-stretch sm:flex sm:ml-2 [&>a]:rounded-lg [&>a]:px-3 [&>a]:py-1.5">
              <ShellLinks />
            </nav>
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

          <BillingBanner />

          <AccountSwitcher />
          {children}
        </div>

        {open && (
          <div className="fixed inset-0 z-50 sm:hidden">

            <div
              className="bg-black/40 absolute inset-0"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <nav
              aria-label="Primary"
              className="border-surface-300 bg-surface-50 dark:border-dark-surface-600 dark:bg-dark-surface-100 absolute top-12 right-auto bottom-0 left-0 flex w-72 max-w-[85%] flex-col gap-1 overflow-y-auto border-r p-2 shadow-2xl">
              <ShellLinks onNavigate={() => setOpen(false)} />
            </nav>
          </div>
        )}
      </div>
    </BarContext.Provider>
  );
}


function ShellLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { routes, useAskBoard } = useProductPorts();
  const destinations = [
    { to: routes.asks, label: 'Asks', icon: Inbox },
    { to: routes.session, label: 'Session', icon: MessageSquare },
    { to: routes.hosts, label: 'Hosts', icon: Server },
    { to: routes.account, label: 'Account', icon: CreditCard },
  ] as const;
  const { pathname } = useLocation();
  const { waiting } = useAskBoard();
  return (
    <>
      {destinations.map(({ to, label, icon: Icon }) => {
        const isActive = pathname === to || pathname.startsWith(`${to}/`);
        const count = to === routes.asks ? waiting.length : 0;
        return (
          <NavItem
            key={to}
            as={Link}
            to={to}
            isActive={isActive}
            onClick={onNavigate}
            icon={
              <span className="relative block">
                <Icon className="h-5 w-5" aria-hidden />

                {count > 0 && <WaitingCount count={count} />}
              </span>
            }
            className={cn(
              'flex w-full items-center gap-3 rounded-lg py-3 text-sm sm:w-auto sm:py-2',
            )}>
            {label}
          </NavItem>
        );
      })}
    </>
  );
}


function WaitingCount({ count }: { count: number }) {
  return (
    <span

      className="bg-warning-500 text-warning-900 dark:bg-dark-warning-500 dark:text-dark-warning-100 absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold"
      aria-label={`${count} ${count === 1 ? 'ask is' : 'asks are'} waiting`}
      role="status">
      <span aria-hidden>{count > 9 ? '9+' : count}</span>
    </span>
  );
}
