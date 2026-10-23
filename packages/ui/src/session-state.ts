/**
 * The ACP session/workspace reducers on their own.
 *
 * `./session` is the product surface and pulls the whole component tree (and
 * with it Monaco). State is useful without any of that — the harness's
 * controller tests import exactly this — so the reducers get their own entry.
 */
export * from './product/session/state/acpSessionState';
export * from './product/session/state/acpWorkspaceState';
