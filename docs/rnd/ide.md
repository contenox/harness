---
title: "The IDE distribution"
description: A Theia-based editor distribution with the Contenox runtime as its engine — built, packaged for Linux and Windows, demonstrated, and withdrawn. What it proved, what it cost, and what survived.
---

# The IDE distribution

An Eclipse Theia distribution with the runtime as its engine, three extensions,
and native installers for Linux and Windows. It shipped, it ran, and it was
withdrawn. This page records it as research rather than as a product.

<video controls muted playsinline preload="metadata"
  poster="https://contenox-website-assets-573643652148.s3.amazonaws.com/media/contenox-ide-action-poster-2030bf900f2a02d70154a0608e1946b75460bd5729abd4a44a2ffb2f7431da4d.webp">
  <source src="https://contenox-website-assets-573643652148.s3.amazonaws.com/media/contenox-ide-action-ad0b18c5d6d85209a7c52b6fd41f22f31c9299499b6eabeb9d7ac15dee0939ed.webm" type="video/webm" />
  <source src="https://contenox-website-assets-573643652148.s3.amazonaws.com/media/contenox-ide-action-e16e1b09c5716aed767d0535332ef5e813690af3f1cd46615c9151caa5a32ffd.mp4" type="video/mp4" />
</video>

## Why it was built

An extension is a participant in someone else's product: its chat, its session
list, its approval widgets, its model-selection policy. The argument that
carried the work forward was that a harness which could not own the surface
would always be a guest in it — and that the runtime was strong enough to
deserve a workbench of its own.

## What it was

- **A distribution, not a plugin.** Eclipse Theia with the Contenox workbench,
  ACP bridge and completion extensions compiled in, packaged as a desktop
  application for Linux and Windows.
- **The runtime as the engine.** The same `contenox` binary the terminal talks
  to, launched by the application, serving sessions, approvals and model
  routing over the same protocol.
- **One acceptance standard.** A capability counted as done only when a clean
  installed copy of the application completed it without a terminal, a
  checkout, or maintainer-owned machine state.

## What it proved

- The engine can carry a full workbench: sessions, tool cards, approvals,
  checkpoints and model selection all work through the ACP seam.
- The protocol is enough for a first-party surface. No private editor API was
  needed for the agent itself.
- A desktop distribution is a company-sized commitment: a framework to track, a
  release train per platform, signing, and packaging for every dependency.

## Why it was withdrawn

The distribution became the definition of done. Once "a clean install of the
IDE completes the capability" was the acceptance test, every other surface lost
its claim to being finished: the CLI drifted, the terminal client was removed,
and the runtime was judged by whether a screen rendered rather than whether an
operator could run work.

The runtime was the product. The distribution was a surface — an expensive one,
in a framework the project did not own, competing for the same weeks that would
have kept the harness operable.

## What survived

- **ACP.** Editors that speak the protocol drive the agent without a fork or a
  vendor extension API. The distribution was replaceable; the seam was not.
- **The acceptance discipline.** "A clean install, a real operation" is the
  right test. The mistake was attaching it to one surface.
- **The rule that a surface must not own policy.** The gate belongs to the
  engine; every client, including this one, renders it.

The distribution is archived, not deleted: it is the strongest evidence the
project has that the engine can sit under a full application, and the clearest
example of what it costs to make a surface the product.
