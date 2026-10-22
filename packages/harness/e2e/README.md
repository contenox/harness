# Harness visual checks

Screenshot tests for the harness SPA, for review rather than for gates.

`run.sh` builds the UI, embeds it in the `contenox` binary, starts `contenox
serve` with a throwaway `$HOME`, and lets Playwright capture one full-page
screenshot per top-level surface.

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
