import { Dropdown } from '../../components/Dropdown';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useProductPorts } from '../ports';
import { roleLabel } from '../lib/roles';

export function AccountSwitcher() {
  const { useAuth, useSwitchAccount } = useProductPorts();
  const { accounts, accountID } = useAuth();
  const switchAccount = useSwitchAccount();
  const [open, setOpen] = useState(false);

  if (accounts.length < 2) return null;
  const active = accounts.find(account => account.id === accountID) ?? accounts[0];

  return (
    <Dropdown
      className="border-surface-300 dark:border-dark-surface-600 relative shrink-0 border-b px-3 py-2"
      trigger={
        <button
          type="button"
          className="text-text-muted dark:text-dark-text-muted hover:text-text dark:hover:text-dark-text
                     flex max-w-full items-center gap-1.5 text-sm">
          <span className="truncate font-medium">{active.name}</span>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      }
      isOpen={open}
      onToggle={setOpen}
      contentClassName="border-surface-300 bg-surface-50 dark:border-dark-surface-600 dark:bg-dark-surface-100
                        top-full left-2 z-20 mt-1 max-h-80 min-w-56 w-max max-w-[calc(100vw-2rem)] overflow-y-auto
                        rounded-xl border shadow-pop">
      <ul role="menu" aria-label="Switch team" className="flex flex-col">
        {accounts.map(account => {
          const isActive = account.id === active.id;
          return (
            <li key={account.id} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  switchAccount(account.id);
                  setOpen(false);
                }}
                className="hover:bg-surface-200 dark:hover:bg-dark-surface-200 flex w-full items-center
                           gap-2 px-3 py-2 text-left text-sm">
                <Check className={`h-4 w-4 shrink-0 ${isActive ? '' : 'invisible'}`} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{account.name}</span>
                <span className="text-text-muted dark:text-dark-text-muted text-xs">
                  {roleLabel(account.role)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Dropdown>
  );
}
