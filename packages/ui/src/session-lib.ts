/**
 * The ACP session helpers that are pure data shaping — no React, no editor.
 *
 * Kept out of `./session` for the same reason as `./session-state`: the product
 * surface entry pulls the component tree (and Monaco), while pages and tests
 * often need only these mappings.
 */
export * from './product/session/lib/configOptions';
