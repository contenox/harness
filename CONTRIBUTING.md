# Contributing to Contenox

Thanks for helping improve Contenox. This repository centers on the V1 runtime
surface: local CLI usage, ACP over stdio, the VS Code extension that embeds
the same Go runtime, and `contenox-runtime serve` hosting the HTTP API and the bundled
cockpit UI.

## Code of Conduct

Treat contributors with respect. Keep technical disagreements concrete and
actionable.

## Architecture

Contenox is a local-first Go runtime with a thin set of host adapters:

```text
CLI / ACP / VS Code stdio bridge
    ->
Service Layer (runtime/*service/)
    ->
Task Engine (runtime/taskengine/)
    ->
Data + Integrations (lib*/ + runtime/runtimetypes/ + runtime/localtools/)
```

The Go runtime owns chains, execution state, model routing, tools, MCP worker
sessions, human-in-the-loop policy, session history, and local state. Editor
integrations should stay adapters around that runtime. They should not re-create
chain semantics in TypeScript or a separate UI server.

### V1 product surface

The V1 public surface is:

- `contenox` CLI
- `contenox-runtime acp` for ACP clients such as Zed, JetBrains, and AionUi
- `contenox-runtime serve`, which hosts the cockpit UI and the HTTP API
  under `/api`, including the OpenAI-compatible and Ollama-compatible inbound
  endpoints and the generated OpenAPI docs (`/api/docs`)

When you change this surface, update
`docs/development/blueprints/v1-feature-map.md` and the relevant user docs in
the same change.

### Abstraction layers

**Service Layer** - each domain gets its own interface and implementation
package (`execservice`, `backendservice`, `mcpserverservice`, `stateservice`,
`hitlservice`, `localfileservice`, etc.). Services communicate through the
shared `runtimetypes.Store` interface and bus events rather than depending on
each other directly.

**Task Engine** (`runtime/taskengine/`) - the core execution model. Chains are
JSON/YAML DAGs with typed I/O (`DataType`: String, Int, JSON, ChatHistory, Any).
Task handlers (`chat_completion`, `execute_tool_calls`, `tools`, `route`,
`raise_error`, `noop`) and branch operators (`equals`, `contains`,
`starts_with`, `ends_with`, `default`, `edge_traversed_at_least`) are
declarative. New Go primitives should be rare.

**LLM Resolution** - `llmrepo.ModelRepo` handles request-side selection by
capability, provider, model, and context length. `modelrepo.Provider`
implementations handle provider-side calls for Ollama/Ollama Cloud, OpenAI, OpenRouter, Anthropic, Mistral, Gemini, AWS Bedrock, Vertex, and
vLLM. Runtime state catalogs configured backend capabilities for selectors and
diagnostics.

**Tool System** - chains invoke tools by name and resolution happens at runtime.
Built-in providers include `local_shell`, `local_fs`, `webtools`, `echo`,
`print`, OpenAPI-backed remote tools, and MCP-backed tools. HITL policy wraps
tool execution where approval is required.

**Event-driven async** - `libbus` abstracts the local event bus. Services publish
typed events such as `task.events.step_completed`, and other services subscribe
without direct package coupling.

**Key files to orient yourself:**

| File | What it shows |
|------|---------------|
| `runtime/taskengine/tasktype.go` | Chain schema, task handlers, branch operators |
| `runtime/taskengine/taskenv.go` | Runtime tool resolution and chain execution context |
| `runtime/contenoxcli/cli.go` | CLI dispatch |
| `runtime/contenoxcli/engine.go` | CLI-local engine bootstrap |

## Repository structure

The `contenox` binary is the main entrypoint. Current commands include `setup`,
`init`, `chat`, `run`, `tools`, `mcp`, `backend`, `agent`, `cache`, `config`,
`model`, `state`, `doctor`, `session`, `acp`, `acpx`, `serve`, `approvals`,
`fleet`, `mission`, `workspace`, `update`, and `version`. (`fleet`, `mission`,
and `approvals` are REST clients to a running `contenox-runtime serve`; `workspace`
grants or revokes the workspace roots a session may run in, written to the
shared config and applied to a running serve live via a reload doorbell;
`acp` and `acpx` speak stdio protocols for editors; most of the rest work
against the local database directly.)

All AI workflow packages live under `runtime/`. Infrastructure libraries
(`libauth`, `libbus`, `libcipher`, `libdbexec`, `libkvstore`,
`libroutine`, `libtracker`) stay at the module root.

```text
cmd/contenox/          contenox binary entry point
runtime/contenoxcli/  CLI command implementations
runtime/taskengine/   chain schema and execution engine
runtime/llmrepo/      provider/model selection
runtime/localtools/   local shell, local filesystem, web, echo, print tools
runtime/*service/     runtime services
docs/development/blueprints/      product and release planning notes
lib*/                 infrastructure libraries with no LLM dependency
```

### Makefile overview

Run `make help` at the repo root for the full list.

| Prefix | Purpose |
|--------|---------|
| `build-*` | CLI and cockpit UI builds |
| `package-*` | product packaging targets |
| `test-*` | Go unit tests, explicit integration suites, and CLI help checks |
| `dev-*` | local binary install helpers |
| `deps-*` | UI dependencies |
| `clean*` | remove generated binaries and build artifacts |

Version bumps and release notes for the **contenox runtime** live in
`Makefile.version` (`make -f Makefile.version help`), which edits
`runtime/version/version.txt`.

### Surface docs

Keep these files in sync when changing public surface area:

- `docs/development/blueprints/v1-feature-map.md`
- `docs/reference/contenox-cli.md`
- `docs/development/windows-development.md`

## Local development setup

### Prerequisites

- [Go](https://go.dev/doc/install) 1.25+
- `make` (helpful; individual `go build` / `npm` commands also work)
- `curl` and `git`
- Node.js 22+ and npm for the cockpit UI
- Optional: an LLM provider key or a local server (Ollama, vLLM).

Native Windows development is a first-class supported path. Use Git for Windows (brings Git Bash), the official Go MSI, and Node.js 22+ for the UI. Place tools, GOPATH, caches, and scratch data on a secondary drive (e.g. `D:`) for performance and cleanliness. Git Bash can run the bash-based build scripts.

WSL2 remains a convenient option for a Linux-like workflow or when you primarily need to produce Linux artifacts.

See `docs/development/windows-development.md` for the complete native Windows guide (including environment setup on a secondary drive, Windows Terminal profiles for Git Bash, and PATH wiring) plus WSL recommendations.

### Go binary path

`go install` puts binaries in `$GOPATH/bin` (or `%GOPATH%\bin` on Windows), usually `~/go/bin`.

Unix shells:

```bash
export PATH=$PATH:$(go env GOPATH)/bin
```

PowerShell:

```powershell
$env:Path += ";$(go env GOPATH)\bin"
```

On Windows you can centralize GOPATH, caches, and PATH on a secondary drive using a small environment script (example patterns are shown in `docs/development/windows-development.md`).

### Building the CLI

Unix / Git Bash:

```bash
# Build the binary into ./bin/contenox-runtime
make build-contenox

# Run an example
./bin/contenox-runtime "list files in this repository"
```

PowerShell (native Windows checkout):

```powershell
go build -o bin\contenox.exe .\cmd\contenox
# or, if make is available
make build-contenox-windows
.\bin\contenox.exe "list files in this repository"
```

Optional (Unix): `make dev-install` symlinks `contenox` to `~/.local/bin/contenox-runtime`.

On Windows you can add the output directory or use the environment setup script to put the binary on your PATH.

## Running tests

Before submitting a pull request, run the checks that match your change.

Fast path, matching CI:

```bash
make test-unit
```

Full Go suite, including any system tests that are not separately gated:

```bash
make test
```

Targeted system suites are explicit because some use local services or containers:

```bash
make test-system
```

vLLM container tests are hidden behind an opt-in gate:

```bash
make test-vllm
```

CLI package and help drift checks:

```bash
make test-contenox-verbose
make test-contenox-help
```

Optional race detector:

```bash
go test -race ./... -run '^TestUnit_'
```

If command names, flags, README examples, or user-facing help changed, also run
`make test-contenox-help` and update the relevant docs.

## Pull request guidelines

1. Open an issue first for major feature or architecture changes.
2. Branch from `main` with a descriptive name such as `feature/xyz`,
   `fix/abc`, or `docs/def`.
3. Use clear commit messages. Conventional Commit prefixes are preferred.
4. Run `gofmt` on Go changes.
5. Keep docs and blueprints in sync with public-surface changes.
6. Keep generated artifacts out of commits unless the release process requires
   them.

## Code conventions

### Go style

- Prefer self-documenting code. Add short comments only for non-obvious
  invariants, protocol behavior, security boundaries, or tricky edge cases.
- Service constructors accept interfaces. Wire concrete implementations in
  `runtime/contenoxcli/engine.go`.
- Keep chain behavior declarative. Business logic belongs in chain definitions
  unless a new primitive is genuinely needed in `taskengine`.
- Tool exposure must be explicit. `execute_config.tools` omitted, `null`, or
  `[]` exposes no registry tools. Use `["*"]` only when a chain intentionally
  opts into all registered tools, and prefer narrow allowlists such as
  `["local_fs"]`.
- Runtime allowlists may restrict task allowlists but must not expand them.
- Wide interfaces are a smell. New code should accept the narrowest interface
  slice it actually needs.
- Public-surface changes (new commands, HTTP routes, compatibility endpoints)
  need matching updates to the user-facing docs.
