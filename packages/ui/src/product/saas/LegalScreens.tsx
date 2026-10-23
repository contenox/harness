import { CheckboxField } from '@contenox/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * A published document: what it is called, which version is on show, and where the text lives.
 */
export interface PublishedDocument {
  /**
   * The identifier stored against the acceptance: terms, privacy or withdrawal_waiver.
   */
  key: 'terms' | 'privacy' | 'withdrawal_waiver';
  /**
   * How the document is named on screen.
   */
  label: string;
  /**
   * The published version this application is showing.
   */
  version: string;
  /**
   * Where the text is.
   */
  href: string;
  /**
   * The sentence the checkbox asserts.
   */
  acceptLabel: string;
}

/**
 * A link to a published document.
 */
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

/**
 * The legal links.
 */
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

/**
 * One checkbox per published document a registration must accept.
 */
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

/**
 * The consent payload a registration sends, one version per document.
 */
export interface RegistrationConsent {
  termsVersion: string;
  privacyVersion: string;
  withdrawalWaiverVersion: string;
}

/**
 * Builds the consent payload from the documents that were shown.
 */
export function consentFromDocuments(documents: PublishedDocument[]): RegistrationConsent {
  const versionOf = (key: PublishedDocument['key']) =>
    documents.find(document => document.key === key)?.version ?? '';
  return {
    termsVersion: versionOf('terms'),
    privacyVersion: versionOf('privacy'),
    withdrawalWaiverVersion: versionOf('withdrawal_waiver'),
  };
}
