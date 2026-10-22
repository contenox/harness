# Contenox

**AI workflows you can run, review, and own.**

AI is becoming an integral part of software engineering. The critical question is whether it makes you sharper or merely more dependent.

Naive AI usage risks turning engineering judgment into **rented fluency**—highly useful while the model is strong, reachable, and affordable, but ephemeral. The durable value in software engineering has never been the typing; it is knowing *what* to build, knowing *what* changed, and maintaining the capacity to own the system when it breaks.

Contenox is built as an **exoskeleton, not an autopilot**. It amplifies the engineer doing the work. You remain firmly in the loop because the workflows, tools, state, and approval policies are entirely authored and reviewed by you.

> **What Contenox is not:** It is not an autonomous coding employee, a hosted autopilot, or a prompt habit hidden away in your shell history.
> It is a **local runtime** for AI-assisted work that keeps an engineer in control.

Docs: **[contenox.com](https://contenox.com)**

---

## For Work That Touches Real Systems

Contenox is purpose-built for high-consequence engineering environments: production repositories, internal APIs, infrastructure scripts, operational dashboards, release pipelines, and systems of record.

In these environments, an "AI agent" cannot mean "give a model broad credentials and hope for the best." It requires a strict runtime boundary:

* **Explicit tools & policies** to govern actions.
* **Local state** to preserve privacy.
* **Human-in-the-loop (HITL) approval** for execution.
* **Reviewable evidence** for auditing.

The core issue is not that agents can act; it is agents acting outside a boundary you author. The model can reason, inspect, and propose—but the **Chain** decides what it may touch, and the **operator** decides what it may change.

---

## Install

```bash
curl -fsSL https://contenox.com/install.sh | sh

```

### Inspect Before Installing

If you prefer to audit the installation script first:

```bash
curl -fsSLO https://contenox.com/install.sh
less install.sh
sh install.sh

```

*Pre-built release downloads and source builds are also available on the [releases page](https://github.com/contenox/harness/releases).*

---

## Quick Start

<!-- TAG=v0.36.0 -->

```bash
contenox setup                    # Choose a provider/model for this machine
contenox "say hello world in python"    # Query directly from the CLI
contenox chat -e                         # Open $EDITOR to compose a rich prompt

```

Manage past contexts effortlessly using `contenox session list` and `contenox session switch <name>`.

### Smart Dual-Model Routing

Inline autocomplete runs on a dedicated model separate from the main chat. This ensures editor ghost text stays entirely local and ultra-low latency, while complex chat queries can leverage larger frontier models:

```bash
# Rich chat routed to a hosted model
contenox config set default-provider          openai
contenox config set default-model             gpt-5-mini

# Ghost text routed to a small, fast model
contenox config set default-autocomplete-provider ollama
contenox config set default-autocomplete-model    qwen2.5-coder:7b

```

---

## Core Use Cases

Contenox excels when workflows are specific, repeatable, and require explicit guardrails:

* **Reviewing Diffs:** Run tests, summarize architectural risks, and gate destructive operations behind manual approvals.
* **Drafting Release Evidence:** Automatically aggregate git logs, PRs, issue tickets, and CI outputs into clean changelogs, deployment checklists, and reviewer packets.
* **Wrapping Internal APIs:** Safely expose subsets of OpenAPI specs while masking sensitive tenant/environment arguments and requiring authorization for mutating calls.
* **Automating Repo Chores:** Ingest an issue tracking item, generate a patch, run local validation checks, and draft the PR description.
* **Inspecting Live Operations:** Query diagnostic dashboards, shell scripts, or Model Context Protocol (MCP) tools via tightly scoped policies rather than broad, persistent credentials.
* **Edge Autocomplete:** Offload editor suggestions to local workstation models while maintaining high-powered reasoning in chat.

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
contenox mcp add notion https://mcp.notion.com/mcp --auth-type oauth

# Wrap an internal HTTP API using its OpenAPI specification
contenox tools add erp_billing \
  --url https://erp.internal.example.com \
  --spec ./billing-subset.yaml

# Bind the local shell under a strictly defined Chain policy
contenox --shell "check Proxmox and flag anything red"

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
      "command": "contenox",
      "args": ["acp"]
    }
  }
}

```

Tool invocations render dynamically as interactive UI cards showing the underlying paths, human-in-the-loop prompts hook directly into the editor's native permissions, and full session history replays automatically upon reopening projects.

### Other Environments

* **Web Interface:** Running `contenox serve` mounts your active sessions, chains, and backends locally inside **Beam**, the bundled web UI.

*Step-by-step guides:* [Zed](https://contenox.com/docs/integrations/editors/zed/) | [JetBrains](https://contenox.com/docs/integrations/editors/jetbrains/) | [AionUi](https://contenox.com/docs/integrations/editors/aionui/).

---

## Managing Backends

Routing rules are treated as system configuration, not application logic. Add hosted, local, or private network backends seamlessly:

```bash
# Private infrastructure & local inference
contenox backend add ollama --type ollama
contenox backend add myvllm --type vllm --url http://gpu-host:8000

# Commercial cloud providers
contenox backend add openai    --type openai    --api-key-env OPENAI_API_KEY
contenox backend add anthropic --type anthropic --api-key-env ANTHROPIC_API_KEY
contenox backend add gemini    --type gemini    --api-key-env GEMINI_API_KEY

# Set global operational routing defaults
contenox config set default-model     qwen2.5:7b
contenox config set default-provider  ollama

```

---

## Building From Source

### Prerequisites

* **Go 1.25+**

```bash
# Clone the repository
git clone https://github.com/contenox/harness
cd runtime

# Build the main core CLI
make build-contenox

```

---

## Core Dependencies

The `contenox` core CLI is written entirely in pure Go. Go dependencies are maintained standardly in `go.mod`.

---

Questions? Reach out at **hello@contenox.com**