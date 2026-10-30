# Contributing to the Contenox desktop app

Thanks for helping improve Contenox. This repository is the desktop app:

```text
desktop/            Electron shell: window, local static server, runtime process management, packaging
packages/harness/   React UI (Vite, TypeScript) shown inside the shell
packages/ui/        @contenox/ui component library, with Storybook
packages/acp-client/ ACP client used by the UI
scripts/            Node helpers behind the npm scripts (tasks.mjs is the task runner)
```

The app bundles the `contenox-runtime` binary, which is built and released from a
separate project. This repository only consumes that binary; you do not need Go.

Please read the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues as
described in [SECURITY.md](SECURITY.md).

## Prerequisites

- Node.js 22 and npm (the version CI uses).
- Nothing else: the developer commands are npm scripts and work the same in PowerShell, cmd and
  POSIX shells. (An optional `Makefile` forwards `make <task>` to the same runner.)
- `git`.

## Setup and development

```sh
npm run setup    # npm ci for packages/ui, packages/harness, packages/acp-client and desktop
npm run dev      # hot-reload sandbox: Electron window + Vite UI + one runtime with throwaway state
```

`npm run setup` always reinstalls (it is `install` for make; `npm run install` is avoided because npm
reserves that name). Do not run `npm install` in the repository root. Other tasks (`dev`, `build`, `test`, `package`, ...) run
`npm ci` only when `node_modules` is missing or a `package.json`/`package-lock.json` is newer
(tracked by `node_modules/.make-installed`).

Run `npm run` to list the tasks and `npm run help` for their descriptions. Options are flags after
`--`: `--runtime-bin=<path>`, `--yes`, `--dry-run`, and `--plan` (print the steps without running
them), for example `npm run dev -- --plan`.

`npm run dev` is a sandbox, not your real app: it builds the UI library (`packages/ui`), fetches the
pinned release runtime (`runtime.lock.json`; skipped when `--runtime-bin=<path>` (or the `RUNTIME_BIN` environment variable) names another
binary), and starts the Electron window with the Vite dev server and a single runtime. State is
thrown away: it lives in `.runtime/dev` inside the checkout, there are no per-project runtimes,
and it never touches your real app data. The UI hot-reloads; after editing `packages/ui` run
`npm run build-ui` again. It stops processes from a previous run first (fixed ports 5173 and 32123).
`npm run help` lists all tasks.

## Build, checks and tests

```sh
npm run build      # build the UI library and the harness UI
npm run typecheck  # tsc for the harness app only
npm run lint       # eslint for the harness app only
npm run test       # unit tests: UI library, harness, acp-client
npm run ci         # install-web, build, typecheck, lint, test (what CI runs)
```

Run `npm run typecheck`, `npm run lint` and `npm run test` before opening a pull request.

### Storybook and story tests

```sh
cd packages/ui
npm run storybook          # http://localhost:6006
npx playwright install chromium   # once
npm run test:stories       # story tests in a headless browser
```

## Trying the app with an unreleased runtime

`npm run qa` and `npm run package-local` package the unpacked app and bundle a
`contenox-runtime` that is not the pinned release:

```sh
npm run package-local      # unpacked app in desktop/dist, bundling contenox-runtime from PATH
npm run qa                 # same, then launch the packaged app
npm run qa -- --runtime-bin=<path-to-contenox-runtime>   # bundle a specific binary instead
```

Without `--runtime-bin` the `contenox-runtime` found on `PATH` is used. To get one,
install a development build with the runtime project's own `make dev-install`
(it installs `contenox-runtime` into your per-user bin directory). The two
projects only share that binary name; neither refers to the other's files.

Other packaging tasks: `npm run package-dir` (unpacked, pinned runtime),
`npm run package` (host installers, verified, with checksums). CI uses `npm run stage`,
`npm run verify`, `npm run checksums` and `npm run sign-rpm`; the last signs Linux `.rpm` files and only
works on Linux.

## Housekeeping

- `npm run stop` stops dev servers, the dev app and runtimes started from this checkout.
  On Windows this releases file locks; install, staging, dev and clean run it first.
  `npm run stop -- --dry-run` only lists them.
- `npm run reset-local-state` shows what would be wiped for a fresh-install test (app data,
  runtime home files, dev state). It is a dry run; `npm run reset-local-state -- --yes` deletes.
- `npm run clean` removes `packages/ui/dist`, `packages/harness/dist`, `desktop/node_modules`
  and `.runtime` (downloaded runtimes and dev-mode state); `-- --dry-run` only lists.
- The old `desktop-*` task names (via `make` or `node scripts/tasks.mjs`) (`desktop-dev`, `desktop-package`, ...) still work for one
  release and print a deprecation note.

## UI conventions

- Build screens from `@contenox/ui` components. If a primitive is missing, add it to
  `packages/ui` together with a story (and a test when it has logic), then use it. Avoid
  one-off styled `div`s in the harness.
- Use semantic design tokens (for example `bg-app`, `bg-raised`, `bg-hover`), not raw colors,
  so themes keep working. See `packages/ui/src/index.css`.
- All user-facing strings go through i18n in `packages/harness/src/i18n.ts`, with both
  English (`en`) and German (`de`) entries.
- `packages/ui/DIVERGENCE.md` records where the library differs from its upstream copy;
  update it when you make such a change.

## Pull request guidelines

1. Open an issue first for major feature or architecture changes.
2. Branch from `main` with a descriptive name such as `feature/xyz`, `fix/abc` or `docs/def`.
3. Use clear commit messages. Conventional Commit prefixes are preferred.
4. Keep `npm run typecheck`, `lint` and `test` green; run `npm run build` when you touch the library or build setup.
5. Use LF line endings in every file (`.editorconfig` sets this). On Windows, set
   `core.autocrlf` so git does not convert them; check with `git ls-files --eol`.
6. Do not commit build output, `node_modules`, or unrelated lockfile changes.
7. Keep user-facing docs in sync with behavior changes.

Licensed under Apache-2.0.
