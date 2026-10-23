/**
 * The protocol layer is the shared package.
 *
 * `@contenox/acp-client` is the same ACP client this app used to carry inline
 * (types, transports, `AcpClient`, factory); it now also serves the CRM console
 * and the EE web client. Re-exporting it keeps the existing `lib/acp` import
 * sites stable while there is exactly one implementation of the wire.
 */
export * from '@contenox/acp-client';
