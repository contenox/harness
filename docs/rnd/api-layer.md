---
title: "The HTTP API layer and OpenAPI generator"
description: apiframework and a from-scratch OpenAPI 3.1 generator that derived a byte-deterministic spec straight from Go route annotations, with CI gates against drift.
---

# The HTTP API layer and OpenAPI generator

Contenox ran on a shared HTTP layer, `apiframework`: authentication, CORS, a structured error envelope, request IDs, and the query/path parameter helpers every route package built on. On top of it sat a from-scratch OpenAPI 3.1 generator that read the route registrations and inline `@request` / `@response` / `@param` annotations directly out of the Go source and turned them into `openapi.json` — embedded into the binary and served live at `/api/openapi.json`, with a bundled RapiDoc viewer at `/api/docs`.

## The problem

A hand-maintained spec drifts from the code it describes. The generator removed the second copy: the handler declares its contract once, and the spec is derived from it.

## How it works

The generator was strict by design. A coverage gate rejected any documented operation missing a `@response` annotation, or any non-GET/DELETE operation missing `@request` — with explicit `none`/`binary`/`sse`/`redirect` forms as the only escape hatches, each requiring its own stated reason. A freshness test regenerated the spec from the working tree on every `go test ./...` run and byte-compared it against the committed file, so a route could not drift out of sync with its documented contract. Generation was fully deterministic — the same tree always produced identical output — and a full `apitests/` pytest suite exercised the compiled routes against that same described contract: backends, missions, chains, tools, HITL policies, MCP servers, model registry, and health, end to end.

The platform that rode this API layer shipped a full account surface — workspace signup, member sign-in, and a separate operator entrance — all served by the same typed contracts.

![The hosted platform's workspace signup form](/lab-site-bob-signup.png)

![The operator sign-in page, a separate entrance from the tenant-facing one](/lab-site-admin-login.png)

## Problems it solved

- **Spec drift.** The spec was generated straight from source annotations, fully automatic and byte-deterministic, with no hand-maintained YAML.
- **Undocumented routes.** Coverage and freshness gates made drift a CI failure, so every route stayed documented because the build refused to pass otherwise.
- **Loose contracts.** Typed request/response contracts are declared once at the handler and enforced structurally, not just documented.
