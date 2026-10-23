---
title: Quickstart
description: Install Contenox and connect a model.
---

# Quickstart

## 1. Install

**macOS / Linux:**

```bash
curl -fsSL https://contenox.com/install.sh | sh
```

**Windows (PowerShell):**

```powershell
irm https://contenox.com/install.ps1 | iex
```

Either script installs a prebuilt release when one exists for the platform, and
falls back to `go install github.com/contenox/harness/cmd/contenox@latest` when
none does. Go 1.25+ is the only prerequisite for the fallback; the harness is
pure Go and needs no C toolchain.

Or download a build directly from [GitHub Releases](https://github.com/contenox/harness/releases/latest).

---

## 2. Initialize a workspace

Run this once in the project directory you want Contenox to work in:

```bash
contenox init
```

This creates the workspace marker and writes the default chain and HITL policy presets.

---

## 3. Optional editor use

Contenox can also run inside editor or desktop clients that speak ACP. The same chains, model config, tools, and HITL policy are used either way:

- [Use from Zed](/docs/integrations/editors/zed/)
- [Use from JetBrains](/docs/integrations/editors/jetbrains/)
- [Use from AionUi](/docs/integrations/editors/aionui/)

---

## Cloud providers

Contenox needs at least one model to work. Pick the option that fits:

| Option | What you need |
|--------|--------------|
| [Ollama](/docs/integrations/providers/ollama/) | Ollama installed locally, or an Ollama Cloud key |
| [Google Gemini](/docs/integrations/providers/gemini/) | A free Gemini API key (no GPU) |
| [OpenRouter](/docs/integrations/providers/openrouter/) | One OpenRouter API key for many hosted models |
| [OpenAI](/docs/integrations/providers/openai/) | An OpenAI API key |
| [Anthropic](/docs/integrations/providers/anthropic/) | An Anthropic API key (Claude) |
| [Mistral](/docs/integrations/providers/mistral/) | A Mistral API key |
| [AWS Bedrock](/docs/integrations/providers/bedrock/) | An AWS account with Bedrock model access |

If you're not sure, start with [Ollama](/docs/integrations/providers/ollama/) — it runs locally and needs no API key.

All providers can also be configured from the Beam UI (`contenox serve`), which
stores keys and creates the matching backend for you:

---

## Next steps

- [**Harness: the bundled web UI**](/docs/guide/harness/) — run `contenox serve` and drive the same sessions, chains, and approval gates in the browser
- [**Your first chain**](/docs/guide/first-chain/) — author your own agent in five edits
- [Core concepts](/docs/guide/concepts/) — how chains, tasks, and tools fit together
- [MCP integration](/docs/integrations/tools/mcp/) — connect external tools
