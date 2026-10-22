---
title: "runnerd: the self-hosted simulation runner"
description: A self-hosted agent that enrolls once, dials home outbound-only, and turns a scenario into many branching AI-driven exercises with an auditable evidence trail.
---

# runnerd: the self-hosted simulation runner

runnerd was the self-hosted half of a tabletop-exercise simulation product: a small binary a customer ran on their own Linux box, enrolled once against a hosted panel by exchanging a one-time token for a long-lived credential, then only ever dialed out — heartbeat, poll, execute, upload — with no inbound port ever opened. Given a scenario, it drove one or many independent branches through a pluggable engine: a hermetic mode that spawned a fresh agent subprocess per branch over the runtime's own ACP client machinery, needing no GPU or model at all, and a real local-inference mode that drove a running `modeld` daemon directly over its own session seam.

A scenario could carry participant roles and a scripted timeline of injected events, turning a single-shot run into a bounded multi-turn exercise — and when a role was marked human, the runner parked mid-run and waited for a live person to submit their move before the AI played its own reaction, rotating through every human party in turn. Every run closed with a size-capped evidence bundle: a full transcript, timings, and outcomes, with confidential participant goals and any grounding material redacted from the recorded form even though they had shaped what the model saw — an explicit redaction seam rather than an accidental leak.

An earlier browser surface over the same substrate, recorded driving a chain run from dispatch through to its collected result:

<video src="/chain-runner-demo.webm" controls muted playsinline style="width:100%;border-radius:8px"></video>

## Problems it solved

- **Running agent work on infrastructure the platform never reaches.** Enroll-once, outbound-only dial-home: the same shape self-hosted CI runners use, applied to AI-driven exercises.
- **Cost of many branches.** Sharing one prefilled prompt prefix across every branch of a run, and re-prefilling only the part that diverged, measured 2.5x faster wall-clock and 16x fewer prompt tokens processed at 16 branches, with flat memory instead of one resident copy per branch.
- **Realistic but auditable exercises.** A redaction seam keeps state that shapes the model's prompt out of the recorded evidence.
- **Grounding without exfiltration.** Local, lexical-only grounding let a run draw on an organization's own documents; their contents never left the machine that read them, only the filenames a run cited.
