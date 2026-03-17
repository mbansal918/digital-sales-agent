# ADR-001 — Monorepo with Turborepo

**Status:** Accepted
**Date:** 2025-01

---

## Context

The system is composed of 6 deployable services and 6 shared packages. We need to decide whether to keep these in a single repository (monorepo) or separate repositories (polyrepo).

## Decision

Use a **monorepo** managed with **Turborepo** and npm workspaces.

## Reasons

**Shared types are the primary driver.** All services share domain types (`Customer`, `ConversationContext`, `DomainEvent`, etc.). In a polyrepo, a type change requires coordinated PRs across multiple repos with versioned npm packages in between. In a monorepo, a single PR updates the type and all consumers simultaneously — the TypeScript compiler surfaces every breaking change before merge.

**Atomic changes across services.** When adding a new event type, we need to update the emitter, the consumer, and the shared type together. A monorepo makes this a single commit rather than a choreographed multi-repo release.

**Turborepo handles the build graph.** It understands that `apps/orchestrator` depends on `packages/ai-core` which depends on `packages/shared-types`. It builds and tests them in the right order, caches outputs, and only rebuilds what changed.

**Deployment is still independent.** Each service has its own Dockerfile. The monorepo structure does not mean they are deployed together — each service is built and deployed independently via CI.

## Trade-offs accepted

- The repository will grow large over time. Mitigated by Turborepo's incremental builds and caching.
- A single broken package can block all CI. Mitigated by isolated test runs per package.
- Onboarding requires understanding the full repo structure. Mitigated by this documentation.

## Alternatives considered

**Polyrepo with versioned npm packages:** Rejected. The coordination overhead for shared type changes is too high for a fast-moving early-stage project.

**Polyrepo with git submodules:** Rejected. Submodules are notoriously painful and solve the wrong problem.
