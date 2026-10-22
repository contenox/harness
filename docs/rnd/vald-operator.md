---
title: "vald-operator: a Kubernetes operator for per-tenant vector search"
description: A Kubernetes controller that turned one declarative object into a full vector-search cluster per tenant, with its unsafe fields made immutable at the API boundary itself.
---

# vald-operator: a Kubernetes operator for per-tenant vector search

vald-operator provisioned a dedicated vector-search cluster for every tenant that needed one — one cluster per tenant-and-embedding-dimension pair — from a single custom resource. Create the object, and the operator rendered it into the underlying vector-search release, watched the resulting workloads until they reported ready, and published the live gateway address back to the platform that asked for it — provisioning infrastructure reduced to the same create-and-watch shape as any other Kubernetes object.

The fields that could silently corrupt a live index if changed — dimension, distance metric, object type — were declared immutable and enforced by the Kubernetes API server itself, through CEL validation on the resource's own schema, so no separate admission webhook was needed and no code path could accidentally slip a mutation through. Changing an embedding model was never an in-place edit; it meant standing up a second cluster and cutting over. The operator's scope was narrow — provision and observe, not rebalance or drain — and it was tested at three tiers: pure unit tests, a real API server via envtest, and a full kind cluster driving a live resource to ready.

Provisioned infrastructure surfaced back in the operator console, where worker pools and hosted app instances were tracked per deployment.

![The operator console's worker-pools view](/lab-admin-bob-worker-pools.png)

![The operator console's hosted-apps view, where an OCI chart becomes a per-tenant instance](/lab-admin-bob-apps.png)

## Problems it solved

- **Per-tenant provisioning as an ordinary Kubernetes object.** One declarative custom resource, reconciled the way Kubernetes reconciles everything else, keeps provisioning observable and easy to test.
- **Silent index corruption.** CEL validation at the CRD level rejects an in-place edit of dimension, metric or object type before it can reach a reconcile loop.
- **Scope.** Provision and observe only, with rebalancing and draining left out, kept the operator small enough to cover with unit, real-API-server and real-cluster tests.
