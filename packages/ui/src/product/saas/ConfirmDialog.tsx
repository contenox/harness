import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { P } from '../../components/Typography';
import { useState, type ReactNode } from 'react';
import { ScreenError } from './ScreenState';
import { TextField } from '../../components/forms/Fields';

export function ConfirmDialog({
  open,
  onClose,
  title,
  confirmLabel,
  onConfirm,
  pending,
  error,
  confirmPhrase,
  confirmPhraseLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;

  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;

  error?: unknown;

  confirmPhrase?: string;
  confirmPhraseLabel?: string;
  children: ReactNode;
}) {
  const [typed, setTyped] = useState('');
  const phraseSatisfied = confirmPhrase === undefined || typed.trim() === confirmPhrase;

  const close = () => {
    setTyped('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={title}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm">{children}</div>

        {confirmPhrase !== undefined && (
          <TextField
            label={confirmPhraseLabel ?? `Type ${confirmPhrase} to confirm`}
            value={typed}
            onChange={event => setTyped(event.target.value)}
            disabled={pending}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
          />
        )}

        {error !== undefined && error !== null && <ScreenError error={error} />}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            variant="danger"
            className="flex-1"
            isLoading={pending}
            disabled={!phraseSatisfied || pending === true}
            onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="outline" className="flex-1" onClick={close} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function Consequence({ count, one, many }: { count: number; one: string; many: string }) {
  return (
    <P className="text-sm">
      <strong>{count}</strong> {count === 1 ? one : many}
    </P>
  );
}
