# ADR-003 — Two-tier context store (Redis + Postgres)

**Status:** Accepted
**Date:** 2025-01

---

## Context

The orchestrator needs to load a customer's full conversation context on every message — including during live voice calls where latency directly impacts user experience. We need to choose a storage strategy that is fast, durable, and cost-effective.

## Decision

Use a **two-tier store**: Redis as the hot cache and PostgreSQL as the durable backing store.

## Reasons

**Voice calls cannot tolerate database latency.** A Postgres query under load takes 5-20ms. Redis is ~1ms. On a voice call, every 10ms of agent processing latency is perceptible. The Redis hot tier eliminates this on the most latency-sensitive path.

**Postgres is the source of truth.** Redis can lose data on restart (without AOF persistence enabled). Every conversation turn and qualification update is written to Postgres durably. If Redis is cold, we rehydrate from Postgres.

**24-hour TTL on Redis contexts is natural.** Most follow-up conversations happen within 24 hours of the initial contact. After that, context is loaded from Postgres on the next interaction — slightly slower, but acceptable for non-live-call scenarios.

**Identity resolution fits Redis perfectly.** Mapping a phone number to a customerId is a pure key-value lookup. Redis is the ideal store for this.

## Trade-offs accepted

- **Eventual consistency:** If a service updates the customer record in Postgres (e.g. CRM service changes status), the Redis cache may be stale for up to 5 minutes. Mitigated by explicit cache invalidation on `lead.status_changed` events.
- **Operational complexity of two stores.** Mitigated by the `packages/context-store` abstraction — no service touches Redis or Postgres directly; they only call the context store API.
- **Redis is not free.** ElastiCache t4g.small is ~$25/month. Acceptable.

## Alternatives considered

**Postgres only:** Rejected for the MVP hot path. 5-20ms is too slow for live voice calls at scale.

**Redis only:** Rejected. Data loss risk on restart without AOF is unacceptable for conversation history that must persist across multi-day sales cycles.

**DynamoDB:** Considered. Good latency and fully managed, but more expensive and less familiar to the team than the Redis + Postgres combination. Revisit if the team moves to a fully serverless architecture.
