import { Form } from '../Form';
import type { ReactNode } from 'react';
import { FormErrorBanner } from './FormErrorBanner';
import { SubmitButton } from './SubmitButton';

export type SectionFormErrors = {
  message?: string;
  retryable?: boolean;
};

export function SectionForm({
  title,
  submitLabel,
  errors,
  pending,
  canSubmit,
  onSubmit,
  note,
  children,
}: {
  title: string;
  submitLabel: string;
  errors: SectionFormErrors;
  pending: boolean;
  canSubmit: boolean;
  onSubmit: () => void;

  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Form
      title={title}
      variant="surface"
      onSubmit={onSubmit}
      actions={
        <SubmitButton pending={pending} disabled={!canSubmit}>
          {submitLabel}
        </SubmitButton>
      }>
      {children}
      {note}
      <FormErrorBanner
        message={errors.message}
        pending={pending}
        onRetry={errors.retryable && canSubmit ? onSubmit : undefined}
      />
    </Form>
  );
}
