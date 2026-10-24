import { Card, Form, P, Page, Small } from '@contenox/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FormErrorBanner, SubmitButton } from '@contenox/ui';
import { LegalLinksNav } from '../LegalScreens';
import type { FormErrors } from './formErrors';

export function AuthScreen({
  children,
  footer,
  intro,
  legalLinks,
}: {
  children: ReactNode;
  footer?: ReactNode;

  intro?: ReactNode;

  legalLinks?: { to: string; label: string }[];
}) {
  return (
    <Page>
      <div className="flex min-h-full flex-col px-4 py-10">
        <div className="my-auto flex w-full flex-col items-center">
          {intro}
          <Card variant="filled" className="w-full max-w-sm">
            {children}
          </Card>
          {footer && (
            <div className="text-text-muted dark:text-dark-text-muted mt-6 flex flex-col items-center gap-2 text-sm">
              {footer}
            </div>
          )}
          {legalLinks && legalLinks.length > 0 && (
            <div className="mt-6">
              <LegalLinksNav links={legalLinks} />
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

export function AuthForm({
  title,
  submitLabel,
  errors,
  pending,
  canSubmit,
  onSubmit,
  children,
}: {
  title: string;
  submitLabel: string;
  errors: FormErrors;
  pending: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Form
      title={title}
      variant="flat"
      onSubmit={onSubmit}
      actions={
        <SubmitButton pending={pending} disabled={!canSubmit}>
          {submitLabel}
        </SubmitButton>
      }>
      {children}
      <FormErrorBanner
        message={errors.message}
        pending={pending}



        onRetry={errors.retryable && canSubmit ? onSubmit : undefined}
      />
    </Form>
  );
}

export function ProductIntro() {
  return (
    <div className="mb-6 w-full max-w-sm text-center">
      <P className="text-xl font-semibold">contenox</P>
      <Small>
        Resume the agent sessions running on your own machines, from anywhere. The runtime is{' '}
        <a
          href="https://contenox.com"
          target="_blank"
          rel="noreferrer"
          className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
          open source
        </a>
        .
      </Small>
    </div>
  );
}

export function AuthLink({
  to,
  state,
  children,
}: {
  to: string;
  state?: { from?: string };
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      state={state}
      className="text-primary-700 dark:text-dark-primary-500 py-1 underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
