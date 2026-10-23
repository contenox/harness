/**
 * The ACP session components, without the workspace/editor surface.
 *
 * `./session` is the whole product surface and re-exports `workspace/`, which
 * drags Monaco (and its workers) into any consumer. Pages that only need the
 * session shell — transcript, config bar, permission ask, composer, pickers —
 * import this entry instead.
 */
export * from './product/session/components/AgentSelector';
export * from './product/session/components/ChatSessionList';
export * from './product/session/components/ConnectionState';
export * from './product/session/components/PermissionRequest';
export * from './product/session/components/SessionAgentBadge';
export * from './product/session/components/SessionConfigBar';
export * from './product/session/components/Transcript';
export * from './product/session/composer/ComposerAudioAttachments';
export * from './product/session/composer/ComposerImageAttachments';
export * from './product/session/composer/MentionMenu';
export * from './product/session/composer/SlashCommandMenu';
export * from './product/session/config/ConfigOptionControl';
export * from './product/session/hooks/useMentionMenu';
export * from './product/session/hooks/useSlashCommandMenu';
