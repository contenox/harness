import { Button } from '../Button';
import type { ReactNode } from 'react';

/**
 * The single action a step offers.
 */
export function SubmitButton({
  children,
  pending,
  disabled,
}: {
  children: ReactNode;
  pending?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full"
      isLoading={pending}
      disabled={disabled === true || pending === true}>
      {children}
    </Button>
  );
}
