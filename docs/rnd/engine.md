---
title: "The engine under every surface"
description: What the Contenox engine does by itself — operations declared once, an Agent Client Protocol surface any client can drive, configuration that verifies itself, local and hosted models, durable events, and approvals the agent cannot bypass.
---

# The engine under every surface

Contenox has a terminal client, a web client, an editor extension, a desktop IDE and a hosted service. None of them owns a capability. Each is a shell over the same engine.

## Operations declared once

A product operation lives in an application service with a typed request and result and a contract holding its summary and the description of each input. Clients read the contract. The command list in a client, the reference pages and the setup screen's help are derived from it, so a command added to the engine shows up everywhere, and a check fails when a derived artifact is out of date and names the command that rebuilds it.

Surfaces parse, authorize, resolve their session and render. They do not choose policy or reimplement the operation.

## A protocol any client can drive

The engine speaks the Agent Client Protocol over newline-delimited JSON, in both roles. An editor, a terminal, a browser through the relay, or another agent can open a session, send a turn, receive streamed updates and tool calls, answer an approval, cancel, list and resume sessions.

A session can have several participants. Updates are mirrored to each one, an approval goes to every participant who can answer it, and the first answer wins. A client that cannot render an approval can say so and still send and watch turns.

An operation the engine knows but does not mount answers with a refusal naming what is unmounted, which a client can tell apart from a method that does not exist.

## Configuration that verifies itself

Setup is a set of commands available from chat, an editor's slash commands or the command line: connect a provider, assign a model to a role, turn an optional role on or off, declare a model's completion contract, download a local model. Assigning a model makes the real request the role will make and records when it succeeded. If the model, connection or contract changes, the role is unverified until checked again. A missing prerequisite is an error that names the command that fixes it.

## Local and hosted models

A role can point at a hosted provider, an OpenAI-compatible endpoint or a local worker. The local path is [modeld](/docs/rnd/modeld/), a separate process that plans context from live hardware, reuses warm prefixes and serves llama.cpp and OpenVINO models behind one contract shared by every client on the machine. Which model serves which role is the operator's declaration.

## Tools

Capabilities for agents are [MCP and OpenAPI tools](/docs/rnd/hooks/) registered once. The engine's file tools go through the same access list as its HTTP routes, and a mission can be dispatched to a paired machine and supervised through the same tools.

## Durable events and approvals

Work that has to survive a restart, retry after a failure or be explained later goes through an append-only [event log](/docs/rnd/event-plane/) and a worker that drains it with cursors and claims. Approval is a blocking protocol operation: the agent asks, a human answers, and a policy the agent cannot alter decides which calls proceed unasked.

## Rules the code follows

- If a model, provider or policy is unset, the engine says so and names the command that sets it. It does not pick a default.
- An error is never dropped, and an empty answer and a failed answer are different answers.
- A required dependency is never optional. A missing one is refused at the boundary.
- A capability counts as done when a user on a clean install can find it, configure it, get what it needs, keep it across restarts, verify it, use it and recover when it breaks.

See [the hosted agent](/docs/rnd/hosted-agent/) for the engine deployed as a shared service.
