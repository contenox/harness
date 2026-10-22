# Why Contenox Harness

This is the Why carried over from the IDE framing and re-derived for a harness.
The belief is unchanged. What changed is where the dependency actually bites and
what proves independence.

## The Golden Circle

**Why — the belief.** The freedom to practice software engineering must not
depend on the permission, policies or continued availability of a single
technology provider.

**How — the approach.** A local harness you run yourself: any model you can
reach with your own credentials, a policy you wrote, sessions and state on your
own disk, and ACP for whatever editor you use. Independence made practical
through defaults rather than configuration expertise.

**What — the product.** Contenox Harness is an open-source agent harness — a
CLI, a local cockpit and an ACP server — that runs authored workflows under a
policy you wrote, on your machine, against the models you choose. It ships no
hosted dependency and requires no account to run.

Open source, local models, model independence and governance are consequences of
the Why, not the Why itself.

## What is different for a harness

An IDE proves independence by still working when the provider is gone. A harness
has a sharper test, because the harness sits between you and the model and
decides what actually runs:

- **Which model served the request.** A vendor harness treats the model you name
  as a preference. If capacity, policy, region or a provider hiccup intervenes,
  you silently get something else and usually no record of it. A harness that
  belongs to the engineer treats the named model as a contract: the model you
  named, or an explicit error with the candidates it could have used.
- **What the request was allowed to do.** The tool boundary, the approval gate
  and the policy envelope live in the harness. If they live in someone else's
  harness, their policy is the one enforced.
- **Where the record lives.** Sessions, tool calls, approvals and the model that
  served each step belong on your disk, readable by you, surviving restarts.

So the harness version of the independence claim is not "it works offline". It
is: **the model I named is the model that ran, the policy I wrote is the policy
that was enforced, and the record is mine.**

## The four dimensions

| Dimension | What it protects in a harness |
| --- | --- |
| Professional freedom | Run the harness without an account, a subscription or a vendor's approval. |
| Operational continuity | Reach any backend with your own key; losing one provider means changing one config line, not losing the tool. |
| Information sovereignty | Sessions, tool arguments, policy and usage records stay in local state; the only outbound traffic is the inference call you configured. |
| Technological independence | ACP instead of a vendor's extension API; no proprietary protocol for core functionality. |

The nuance stays: this does not mean rejecting commercial providers or
circumventing their terms. It means using them when they provide value without
making them indispensable. Independence is about maintaining alternatives, not
promising that every local alternative matches the strongest hosted model.

## Decision test

Every future decision is checked against the Why:

| Decision | Consistent? |
| --- | --- |
| Serve the model that was named, or fail loudly | Yes — fidelity is the proof |
| Silently substitute or fall back to another model | No — the exact dependency this exists to remove |
| Support any backend the operator configures, with their own key | Yes |
| Require a Contenox account to run the harness | No |
| Keep a hosted relay, optional and removable | Yes, if removing it does not remove operation |
| Enforce the policy envelope locally, before any tool runs | Yes |
| Hide ordinary complexity behind defaults | Yes — independence must be usable |
| Make one vendor's harness or protocol required for core work | No |
| Publish a receipt: requested model vs served model, tokens, per step | Yes — it makes the claim checkable |

## The continuity test

The promise is checkable, so it should be documented honestly: if a provider
becomes unavailable tomorrow, which tasks still run, which degrade, and which
stop?

With Contenox Harness: authored workflows, sessions, tools, approvals and every
backend still reachable keep working. Only a request that names an unreachable
model fails — and it fails visibly, naming the candidates, rather than being
quietly answered by a different model. That difference is the product.

## Not against providers

Contenox is not against AI providers. It is against making a software
engineer's professional freedom contingent on any one of them.
