/**
 * The workspace reducer now lives in the shared session package.
 *
 * `@contenox/ui/session` carries this reducer, its actions and its types; the
 * harness keeps this module as the import seam so the app-side controller and
 * pages do not depend on the package layout.
 */
export {
  EMPTY_SESSION_KEY,
  acpSessionsReducer,
  acpWorkspaceReducer,
  initialAcpSessionsState,
  initialAcpWorkspaceState,
  selectFocusedSession,
  selectOpenSessionIds,
} from '@contenox/ui/session-state';
export type {
  AcpSessionLoadState,
  AcpSessionsAction,
  AcpSessionsState,
  AcpWorkspaceAction,
  AcpWorkspaceState,
  AcpWorkspaceStatus,
} from '@contenox/ui/session-state';
