# Contenox

**A desktop app for demanding work — and the people accountable for it.**

An open-source, vendor-neutral harness for policy-enforced AI agent orchestration.

Contenox runs authored agent workflows as a local process. The policy that gates
each tool call is a file the operator wrote, enforced by the harness before
anything runs. Backends are configuration; sessions, approvals and per-step
records stay on disk.

Contenox ships as a desktop app with a bundled runtime. The app is the cockpit:
sessions, missions, approvals, projects and backends. The runtime serves the CLI,
the HTTP API and ACP; editors attach over ACP; and the model named in a request
is the model that serves it — or the run stops with the candidates it could have used.

> **What Contenox is not:** it is not an autonomous coding employee, not a hosted
> autopilot, and not a vendor's harness. It is a local runtime for AI-assisted
> work that keeps the operator accountable for what runs.

Docs: **[contenox.com](https://contenox.com)**

---

## For Work That Touches Real Systems

Contenox is purpose-built for high-consequence engineering environments: production repositories, internal APIs, infrastructure scripts, operational dashboards, release pipelines, and systems of record.

In these environments, an "AI agent" cannot mean "give a model broad credentials and hope for the best." It requires a strict runtime boundary:

* **Explicit tools & policies** to govern actions.
* **Local state** to preserve privacy.
* **Human-in-the-loop (HITL) approval** for execution.
* **Reviewable evidence** for auditing.

The core issue is not that agents can act; it is agents acting outside a boundary the operator authors. The model can reason, inspect, and propose—but the **Chain** decides what it may touch, and the **operator** decides what it may change.

---

## Install

**Desktop app:** download the installer for your platform from **[contenox.com](https://contenox.com)** —
Linux (`.deb`, `.rpm`), macOS (`.dmg`, `.zip`), Windows (`.exe`, `.zip`). Every release ships a
`SHA256SUMS` file and a detached GPG signature; the RPM is signed.

**Runtime only (CLI, servers, CI):** the runtime is its own repository,
[contenox/runtime](https://github.com/contenox/runtime). Its
[releases](https://github.com/contenox/runtime/releases) carry `contenox-runtime-<os>-<arch>`
binaries, `SHA256SUMS` and a signed manifest; the desktop app pins one of these versions in
`runtime.lock.json`.

---

## Quick Start

Contenox installs two commands:

- `contenox` — the desktop app. `contenox .` opens the folder you are standing in as a project; add or switch projects from the sidebar at any time.
- `contenox-runtime` — the runtime CLI: chat, sessions, backends, `serve`, and ACP.

```bash
contenox .                        # Open this folder as a project in the desktop app
contenox-runtime setup                    # Choose a provider/model for this machine
contenox-runtime "say hello world in python"    # Query directly from the CLI
contenox-runtime chat -e                         # Open $EDITOR to compose a rich prompt

```

Manage past contexts effortlessly using `contenox-runtime session list` and `contenox-runtime session switch <name>`.

### Separate Model Roles

Chat and completion are separate roles, each with its own provider and model. A frontier model can serve chat while a small local model serves completion requests:

```bash
# Rich chat routed to a hosted model
contenox-runtime config set default-provider          openai
contenox-runtime config set default-model             gpt-5-mini

# Ghost text routed to a small, fast model
contenox-runtime config set default-autocomplete-provider ollama
contenox-runtime config set default-autocomplete-model    qwen2.5-coder:7b

```

---

## Core Use Cases

Contenox excels when workflows are specific, repeatable, and require explicit guardrails:

* **Reviewing Diffs:** Run tests, summarize architectural risks, and gate destructive operations behind manual approvals.
* **Drafting Release Evidence:** Automatically aggregate git logs, PRs, issue tickets, and CI outputs into clean changelogs, deployment checklists, and reviewer packets.
* **Wrapping Internal APIs:** Safely expose subsets of OpenAPI specs while masking sensitive tenant/environment arguments and requiring authorization for mutating calls.
* **Automating Repo Chores:** Ingest an issue tracking item, generate a patch, run local validation checks, and draft the PR description.
* **Inspecting Live Operations:** Query diagnostic dashboards, shell scripts, or Model Context Protocol (MCP) tools via tightly scoped policies rather than broad, persistent credentials.

The exact same Chain runs seamlessly across the **Terminal, Zed, JetBrains, AionUi,** or any standard ACP client.

---

## Security & Runtime Protection

| Identified Risk | Contenox Mitigation |
| --- | --- |
| **Fleeting Agent History** | Chains are declarative files: easily reviewable, version-controlled, and repeatable. |
| **Unbounded Agent Access** | Enforced via strict tool allowlists, localized command policies, and tightly scoped API definitions. |
| **Post-Damage Review** | Destructive actions are systematically blocked by human-in-the-loop approval gates prior to execution. |
| **Leaky Internal APIs** | Curated OpenAPI subsets encapsulate hidden environment variables, auth tokens, and tenant arguments. |
| **Vendor Lock-in** | Provider and model routing live in configuration files, entirely decoupled from application logic. |
| **Frontier Model Budget Burn** | Routine tasks and linting checks are automatically routed to local or private-network infrastructure. |
| **Exfiltration of Team Data** | All interactive sessions, states, configs, and runtime logs remain completely local. |

---

## Architectural Fit

Contenox serves as the local agent runtime layer running between your interface and your infrastructure.

| Ecosystem | The Contenox Paradigm |
| --- | --- |
| **IDE Copilots** | Editor assistance is only one piece of the puzzle. Workflows must execute uniformly across the terminal, IDEs, and independent headless scripts. |
| **CLI Coding Agents** | A single coding loop is not a structured runtime. Contenox adds multi-session persistence, strict tool authorization, explicit model routing, and human gates. |
| **LangChain / Frameworks** | Software development libraries are not end-user products. Contenox provides an out-of-the-box executable runtime tailored for engineers and teams. |
| **Dify / n8n / Web Tools** | Workflows touching local source code and specialized internal infrastructure should never depend on a third-party SaaS control plane. |
| **Ollama Wrappers** | A model provider is not a workflow boundary. Contenox introduces native Chains, secure tool definitions, and dynamic routing across hybrid infrastructure. |

---

## Connect Your Stack

Any asset accessible via an OpenAPI spec, a shell command, or an MCP server can be transformed into a secure tool inside a Contenox Chain:

```bash
# Connect any Model Context Protocol (MCP) server
contenox-runtime mcp add notion https://mcp.notion.com/mcp --auth-type oauth

# Wrap an internal HTTP API using its OpenAPI specification
contenox-runtime tools add erp_billing \
  --url https://erp.internal.example.com \
  --spec ./billing-subset.yaml

# Bind the local shell under a strictly defined Chain policy
contenox-runtime --shell "check Proxmox and flag anything red"

```

---

## Editor Integration

Contenox natively communicates via the [Agent Client Protocol (ACP)](https://github.com/zed-industries/agent-client-protocol) over standard I/O.

### Zed Integration

Add the following snippet to your `~/.config/zed/settings.json`:

```json
{
  "agent_servers": {
    "Contenox": {
      "type": "custom",
      "command": "contenox-runtime",
      "args": ["acp"]
    }
  }
}

```

Tool invocations render dynamically as interactive UI cards showing the underlying paths, human-in-the-loop prompts hook directly into the editor's native permissions, and full session history replays automatically upon reopening projects.

### Other Environments

* **Desktop app:** the cockpit shows your sessions, missions, approvals, projects and backends for the runtime it bundles. `contenox-runtime serve` exposes the same HTTP API and ACP WebSocket for other local clients.

*Step-by-step guides:* [Zed](https://contenox.com/docs/integrations/editors/zed/) | [JetBrains](https://contenox.com/docs/integrations/editors/jetbrains/) | [AionUi](https://contenox.com/docs/integrations/editors/aionui/).

---

## Managing Backends

Routing rules are treated as system configuration, not application logic. Add hosted, local, or private network backends seamlessly:

```bash
# Private infrastructure & local inference
contenox-runtime backend add ollama --type ollama
contenox-runtime backend add myvllm --type vllm --url http://gpu-host:8000

# Commercial cloud providers
contenox-runtime backend add openai    --type openai    --api-key-env OPENAI_API_KEY
contenox-runtime backend add deepseek  --type deepseek  --api-key-env DEEPSEEK_API_KEY
contenox-runtime backend add anthropic --type anthropic --api-key-env ANTHROPIC_API_KEY
contenox-runtime backend add gemini    --type gemini    --api-key-env GEMINI_API_KEY

# ChatGPT subscription: device login, no API key
contenox-runtime backend add chatgpt --type openai-codex
contenox-runtime backend login chatgpt

# Set global operational routing defaults
contenox-runtime config set default-model     qwen2.5:7b
contenox-runtime config set default-provider  ollama

```

The same providers appear in the app's Setup wizard and in Backends → Cloud Providers, where the ChatGPT subscription signs in with a device code and DeepSeek takes an API key.

---

## Building From Source

This repository is the desktop app and its cockpit (Electron, React). The runtime is
[contenox/runtime](https://github.com/contenox/runtime) (Go).

### Desktop app

* **Node.js 22+** and npm

```bash
git clone https://github.com/contenox/contenox-v0
cd contenox-v0
npm run ci                # install, build, typecheck, lint, test
npm run runtime-fetch     # download and verify the pinned runtime
npm run package-dir       # unpacked desktop app for this host
npm run package           # host installers
```

The npm scripts at the repository root only run `scripts/tasks.mjs` (no dependencies, no
`npm install` at the root). `npm run help` lists every task. Options go after `--`, for example
`npm run qa -- --runtime-bin=<path>`. `make <task>` is an optional alias for the same tasks.

### Runtime

The `contenox-runtime` CLI (Go) is a separate project: [contenox/runtime](https://github.com/contenox/runtime). Build it from its own README; this repository only consumes the binary.

---

## Core Dependencies

The runtime is pure Go; its dependencies live in `go.mod` of [contenox/runtime](https://github.com/contenox/runtime). The desktop app is Electron with a React cockpit; its dependencies live in the `package-lock.json` files of `desktop/` and `packages/*`.

---

## Roadmap

Planned, in the order we expect to use them:

* **Stay in flow:** find any file or text in your project and move through it without leaving the keyboard.
* **Agents that react:** a file changes, a commit lands, and the right agent picks up the work without being asked.
* **Review on your terms:** see what an agent changed, side by side, and accept it piece by piece.
* **Your machines, not just this one:** run agents on your own servers and VMs and work with them from here.
* **Later:** agents that know your whole codebase, completion as you type, and your existing agent definitions working here unchanged.

Small releases, no dates.

---

Questions? Reach out at **hello@contenox.com**