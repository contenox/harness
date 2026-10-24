import { CheckboxField } from '@contenox/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface PublishedDocument {
  key: 'terms' | 'privacy' | 'withdrawal_waiver';
  label: string;
  version: string;
  href: string;
  acceptLabel: string;
}

export function DocumentLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary-700 dark:text-dark-primary-500 underline-offset-4 hover:underline">
      {children}
    </a>
  );
}

export function LegalLinksNav({
  links,
  ariaLabel = 'Legal',
}: {
  links: { to: string; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
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

export function LegalConsentFields({
  documents,
  accepted,
  onToggle,
  disabled,
  errorFor,
}: {
  documents: PublishedDocument[];
  accepted: Record<string, boolean>;
  onToggle: (key: PublishedDocument['key'], checked: boolean) => void;
  disabled?: boolean;
  errorFor?: (key: PublishedDocument['key']) => string | undefined;
}) {
  return (
    <>
      {documents.map(document => (
        <CheckboxField
          key={document.key}
          label={document.acceptLabel}
          checked={accepted[document.key] === true}
          onChange={checked => onToggle(document.key, checked)}
          disabled={disabled}
          error={errorFor?.(document.key)}>
          <DocumentLink href={document.href}>
            {document.label} ({document.version})
          </DocumentLink>
        </CheckboxField>
      ))}
    </>
  );
}

export interface RegistrationConsent {
  termsVersion: string;
  privacyVersion: string;
  withdrawalWaiverVersion: string;
}

export function consentFromDocuments(documents: PublishedDocument[]): RegistrationConsent {
  const versionOf = (key: PublishedDocument['key']) =>
    documents.find(document => document.key === key)?.version ?? '';
  return {
    termsVersion: versionOf('terms'),
    privacyVersion: versionOf('privacy'),
    withdrawalWaiverVersion: versionOf('withdrawal_waiver'),
  };
}
