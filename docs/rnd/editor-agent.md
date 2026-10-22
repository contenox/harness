---
title: "The editor agent"
description: A VS Code extension that bundled the runtime and registered as a native language-model vendor, and an Agent Client Protocol implementation that made approval a blocking protocol operation — in both directions.
---

# The editor agent

The Contenox VS Code extension put the runtime inside the editor as a workspace extension. Each VSIX bundled one native `contenox` binary for its target — Linux, macOS and Windows, x64 and ARM64 — and spawned it as a child process speaking header-framed JSON-RPC 2.0 over stdio, eighteen client-to-agent methods wide. No server, no port, no daemon: state lived in the same local database the CLI used. Because it declared itself a workspace extension, over SSH, WSL, Dev Containers and Codespaces it ran on the remote host beside the checked-out code rather than on the laptop driving the window. It registered as a native VS Code language-model vendor, so Contenox models appeared in the editor's own model picker; it contributed an `approve_contenox_tool_call` language-model tool, an MCP server definition provider, an inline-completion provider bound to a deliberately separate FIM model from chat, diagnostics code actions behind the lightbulb, and around thirty-five palette commands. Telemetry was a local JSONL file and nothing else. Release engineering was treated as a correctness surface: a package guard failed the build on a VSIX containing zero or more than one native binary, a wrong extension id, a non-PNG icon, bundled sources or maps, or a missing approval-tool contribution; a verify job asserted `package.json`, the version file and the git tag agreed before any of the five platform targets were built; publishing sat behind a protected environment that required a human. CI ran the real Extension Development Host headless under `xvfb` on every pull request.

## The approval boundary

A runtime HITL gate produced an approval request, and the design rule was that this had to be a *blocking protocol operation*, never a notification followed by a later response — because an editor that fails to render an approval must not leave the runtime free to keep reasoning and pick a different tool the policy happens to allow. One shared Go package built the request for both transports, so an approval looked identical whether it went to VS Code or to an ACP editor: a tool-call id, a title composed from the tool path and an eighty-rune argument summary, a kind mapped onto the protocol's own `read`/`edit`/`delete`/`move`/`execute`/`fetch` vocabulary, a structured diff block whenever a before-and-after pair existed, and metadata naming the policy and the policy file that demanded the approval. Exactly two options were ever offered, both scoped to the single call: allow once and reject once. There was no "always allow", so no approval could widen into a standing grant. The editor never learned the tool catalogue — policy and tool identity stayed in the runtime — and every failure path denied: a cancelled outcome, an unrecognised outcome, a missing handler, a closed connection, a cancellation token already fired.

Permission handlers were registered by session id and dispatched on an exact match, denying when no session matched. A single connection served the chat panel and every chat editor tab, and a stack dispatched last-in-first-wins would have let a permission card render in the wrong conversation bound to the wrong invocation token — a confused deputy reachable through two open tabs. The bridge also carried no pending-permission guard: the blocking request is the enforcement, and a guard ported from the ACP service, where events arrive asynchronously, could never open its window in a bridge that publishes synchronously on the tool goroutine. Abandonment was symmetric, with a `$/cancelRequest` in both directions so a runtime timeout could not leave a live modal on screen whose "Allow" would be silently swallowed, and both framers carried a 64 MiB bound on declared content length.

![The Contenox VS Code extension icon](/vscode-extension-icon.png)

## Other editors

The same protocol implementation served editors that were never ours. `contenox-cli acp` ran as an Agent Client Protocol agent under Zed, under JetBrains IDEs — verified against GoLand 2026.1.2, which does not advertise the protocol's terminal capability, so shell output was reported in the tool card instead of a live embedded terminal — and under the AionUi desktop client. A separate `contenox-cli acpx` profile served drivers with no human at an editor at all, replacing interactive approval with a static containment policy because prompts arriving from a chat inbox have nobody to ask. In a pristine home directory the agent has to boot cleanly: a setup-only transport answers `initialize` and `authenticate` with no engine behind it, and session creation returns an actionable typed error, so a client sees a fixable agent rather than a silent one.

## Driving external agents

Contenox also spoke the protocol in the other direction, driving external agents as a client. An external agent was registered by name and spawned over stdio inside a sandbox that scrubbed the environment and denied it `~/.contenox-harness` outright — an agent must never reach the policy that governs it. The one exemption, a chain unit re-invoking this very binary, could not be set by config or environment variable; it was inferred only from the command resolving to the running executable. An observe-only client answers a permission request with a clean, spec-shaped reject-once rather than "method not found", which well-behaved agents read as a broken client; with the reject-once the agent reports the denial and ends its turn on its own terms.

`contenox-cli agent check` drove a registered agent end to end from the terminal — a real turn, its stop reason, the commands the agent advertised, and the MCP servers forwarded to it:

![Terminal recording of contenox-cli agent check streaming a reply from a registered external agent, then printing the turn's stop reason, the agent's advertised command list, and the MCP servers forwarded to it](/agent-check.gif)

Registered agents appeared beside the native one wherever a session started, so picking who answers was a normal part of opening a chat rather than a configuration exercise.

![The agent picker open in the sessions sidebar, with the native Contenox agent at the top and registered external agents listed below it](/agent-picker.png)

Whatever slash commands an agent advertised over the protocol were proxied straight into the composer's own menu.

![The composer's slash-command menu listing commands advertised by the connected agent](/agent-slash-menu.png)

A gated action from any agent — ours or a foreign one — stopped at the same inline permission card in the transcript, with Allow and Deny as the only exits — clicking outside it did nothing, so there was no accidental answer.

![An inline permission card in the chat transcript showing the tool call awaiting a decision, with Allow and Deny buttons](/agent-permission-card.png)

## Problems it solved

- **An approval that could be skipped.** Modelling it as a reverse request the agent waits on makes the gate real; a fire-and-forget event leaves the runtime free to keep reasoning while the human is still deciding.
- **Different cards per transport.** One approval builder serves both transports: same title, tool kind, diff block and policy metadata, whether the answer comes from VS Code's native confirmation or an ACP editor's own UI.
- **Approvals widening into grants.** Once-scoped options only.
- **Approvals landing in the wrong tab.** Routing strictly by session id, and denying on no match, keeps a card in front of its own conversation.
- **A dead-looking agent.** Answering `initialize` from a setup-only transport, and failing session creation with a typed, actionable error, lets a client diagnose a bare home directory.
- **A foreign agent editing its own policy.** Its sandbox excludes the runtime's state directory in addition to scrubbing the environment.
- **A misread refusal.** A clean reject-once gives a correct, reportable denial instead of an agent narrating an error.
