import { Card, Form, P, Page, Small } from '@contenox/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FormErrorBanner, SubmitButton } from '@contenox/ui';
import { LegalLinksNav } from '../LegalScreens';
import type { FormErrors } from './formErrors';

/**
 * The frame the sign-in screens share: a single card, centred, with the cross-links underneath.
 */
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

/**
 * A step in the funnel: a title, some fields, one action, one banner.
 */
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

/**
 * The product line above the sign-in and sign-up cards: the name, and one sentence saying what this is.
 */
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

/**
 * A cross-link between sign-in screens.
 */
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
