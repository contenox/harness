# Harness visual checks

Screenshot tests for the harness SPA, for review rather than for gates.

`run.sh` builds the UI, resolves the pinned `contenox-runtime` binary from
`runtime.lock.json` + `.runtime/` (`npm run runtime-fetch` if missing), seeds a throwaway
`$HOME` with a **scripted-test backend** and one ACP conversation, starts
`contenox-runtime serve` against it plus the SPA server from
`desktop/src/server.mjs` (via `serve-ui.mjs`) in front of it, and lets Playwright capture one full-page
screenshot per top-level surface.

Seeding is what makes the captures worth reviewing: an unconfigured instance
renders the first-run setup wizard on every route (ten identical screenshots).
The scripted backend replays a fixed dialog — no model, GPU, key or network —
so the chat transcript is deterministic across machines, and it keeps the
surfaces out of their empty/setup states. The conversation is created over the
ACP surface (`seed_acp_session.py`), because the sidebar is fed by ACP
`session/list`; a session created with `contenox-runtime "<prompt>"` would not appear
there. `contenox-runtime acp` resolves its workspace from `$HOME/.contenox-harness`
while `serve` resolves it from the launch directory, so the seeder is handed the
serve workspace id explicitly.

The SPA routes on the **URL hash** (`#/chat`, `#/backends`, …); the tests
address those hash routes directly, since a plain path only loads the shell and
the router falls back to `#/chat`.

The workbench captures (`workbench.png`, `workbench-file.png`,
`workbench-phone.png`) mount the library's session layout at
`#/workbench/<sessionId>`: file tree, open files, preview pane and the live
transcript. `run.sh` seeds a small workspace (`README.md`, `notes.txt`,
`src/main.ts`) so the tree and the preview have content; the phone capture
discovers the session at desktop width and then shrinks, because the sidebar
list is not in the DOM while collapsed.

One product detail the seeding papers over: `contenox-runtime init` registers `llama`
and `openvino` backends for a modeld install, which this build reports as
"Unsupported backend type". `run.sh` removes them so the capture shows the state
a configured user actually has; the registration itself is worth fixing in
`init`.

```bash
packages/harness/e2e/run.sh                    # first run seeds, later runs compare
packages/harness/e2e/run.sh --update-snapshots # accept an intended visual change
```

**Screenshots are never committed.** They are written to `e2e/screenshots/`,
which `.gitignore` excludes. The directory is the baseline: seed it on a clean
checkout, keep it out of git, and review diffs locally. Playwright writes
`*-diff.png` and `*-actual.png` beside a failing baseline; those are the review
artefacts.

State is a fresh database, because that is the first-run state a reviewer sees.
Surfaces that need a configured model (chat, missions) render their empty or
setup state; give the serve process a seeded `$HOME` if a richer capture is
wanted.

## Functional suite (L3)

`tests/functional.e2e.ts` drives the UI against the same seeded stack and asserts state
(files on disk, runtime API responses, UI text), not screenshots. It covers the L3 rows of
`release-test-plan.md`; rows 4, 5, 7 and 26 are skipped as "live lane only".

```bash
CONTENOX_RUNTIME_BIN=/path/to/contenox-runtime packages/harness/e2e/run.sh tests/functional.e2e.ts
HARNESS_SKIP_BUILD=1 ...   # reuse packages/harness/dist
```

`run.sh` exports `HARNESS_*` variables (runtime URL and port, binary, throwaway home, work
folder, scripted dialog, echo MCP fixture) that the tests read. Each test rewrites the scripted
dialog (`HARNESS_DIALOG`) to script the turns it needs: one `"general"` turn for the router,
then the agent turns, including `tool_calls` such as `local_fs.write_file`. `mock-openai.mjs`
is an OpenAI-compatible server for the provider rows (it can fail chat requests on demand);
`proc.mjs` finds and stops processes by port, which row 1 (empty home) and row 23 (restart of
`serve`) use. The runtime log of the last run is kept in `packages/harness/test-results/runtime-serve.log`.
