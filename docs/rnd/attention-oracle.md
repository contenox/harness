---
title: "The attention oracle"
description: A second agent that triaged a mission's questions and gated tool calls so unattended runs would not stall — one ask in, one verdict out.
---

# The attention oracle

The oracle was a small agent whose only job was reading another agent's asks and ruling on the routine ones, so an unattended run did not park waiting for a person. It adjudicated questions and gated tool calls, and was mounted from config rather than a flag.

The shipped design is [The oracle](/docs/use-cases/auto-attention/).

## The verdict contract

One ask in, one verdict out, no chat text, one tool, a hard round budget. An agent that can only rule cannot wander into doing the work it was asked about. The contract stayed fixed while the surrounding feature changed, and the wider scope was built on it.

Only one variant ships. `conservative` versus `default` was a dial with no units: nobody could say which to pick without running both, and running both means reading every verdict, which is the cost the oracle existed to remove.

## One in-process seam

The first flow crossed the mission unit, a durable ask, an attention bound, a checkpoint, a resume hook, a bus subject, a report router, and a second chain, which made it hard to explain. The oracle now mounts on one in-process seam (`hitlservice.Adjudicator`) instead of riding the bus and the report router's supervisor offer.

## Two kinds of ask

| | Reduce it by | Adjudicate it because |
|---|---|---|
| **questions** | writing a narrower intent | the intent sometimes already answers it |
| **gated tool calls** | nothing — the gate is correct | per-call judgment is the only thing that can decide it |

A subagent that raises enough routine questions to need a filter is usually a subagent whose intent is too vague; the lever is the intent, not a second model reading the overflow.

A subagent hitting an `approve`-tier tool call is not asking a badly-scoped question. It is hitting the envelope working as designed, and the only way to remove the interruption without the oracle is to move the call to `allow` — the blanket permission the envelope declined to grant. Per-call judgment is what decides it.

## Subagents

`mission_start` blocks the parent's turn while the subagent runs. A parent that spawned a subagent therefore cannot answer that subagent's question — it is parked inside its own tool call. With subagents as the prime path, the oracle is the answerer for the one case the design structurally cannot answer itself.

## Problems found around it

An end-to-end test of the unattended flow found three defects in the flow around the oracle:

- `mission fire --wait` did not return when a run parked. It blocked until a terminal status or the timeout, then tore the unit down, so "fire it and walk away" did not work from a terminal.
- The parked ask was swept to its on-timeout verdict rather than held.
- `approvals list` — a read-shaped command — silently resumed stranded runs as a side effect.
