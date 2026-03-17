# 07 — Scalability & Resilience

## Scaling model

Each service scales independently. The system is designed so that the bottleneck is always the external API (Twilio, Anthropic) — not internal infrastructure.

| Service | Scaling axis | Notes |
|---|---|---|
| Gateway | Horizontal (stateless) | Add instances freely; Twilio webhooks load-balanced |
| Orchestrator | Horizontal (SQS consumers) | More instances = more parallel conversations |
| Agent | Horizontal (stateless) | Pure compute; scale based on LLM call latency |
| Workflow | Single instance for MVP | Move to pg-boss with multiple workers in production |
| CRM Service | Horizontal | HubSpot API rate limit is the ceiling |
| Admin UI | Horizontal (stateless Next.js) | CDN-served static assets |
| Redis | Vertical + read replicas | ElastiCache with Multi-AZ and read replica |
| Postgres | Vertical + read replicas | RDS Multi-AZ; read replicas for Admin UI queries |

---

## Throughput estimates (MVP)

| Metric | Estimate | Headroom |
|---|---|---|
| Concurrent voice calls | 20-50 | Twilio account limit; raise as needed |
| Messages processed/minute | ~300 | SQS + Orchestrator scale linearly |
| Agent LLM calls/minute | ~100 | Anthropic API rate limit; monitor closely |
| Redis ops/second | ~10k | Well within ElastiCache t4g.small |
| Postgres connections | ~50 (pool) | RDS t4g.small handles ~200 |

---

## Failure modes and recovery

### Twilio webhook timeout

**Problem:** Twilio requires a TwiML response within 15 seconds. If the orchestrator + agent loop takes too long, Twilio times out and the call drops.

**Mitigation:**
- Gateway returns a `<Pause>` TwiML immediately, buying 5 seconds
- Orchestrator processes the message and calls a Twilio REST API to redirect the call to a new TwiML URL with the agent response
- If processing still exceeds ~12 seconds, the agent returns a "give me a moment" voice response while processing continues
- Target: agent loop completes in < 4 seconds (p95)

---

### Redis unavailable

**Problem:** Context reads fail, all conversations appear as new customers.

**Mitigation:**
- Orchestrator falls back to Postgres for context reads (slower but correct)
- New contexts are written to Postgres immediately; Redis write is best-effort
- Circuit breaker prevents hammering a degraded Redis instance

---

### Anthropic API unavailable or slow

**Problem:** Agent cannot produce a response.

**Mitigation:**
- Retry with exponential backoff (3 attempts, max 10s total)
- Fallback response: "I'm having a technical issue — I'll have a team member call you back shortly" + trigger handoff
- Alert fires if error rate > 5% over 5 minutes

---

### SQS message processing failure

**Problem:** Orchestrator crashes mid-processing; message is not acknowledged.

**Mitigation:**
- SQS visibility timeout: 60 seconds. Message re-appears if not deleted.
- After 3 failed attempts, message moves to dead-letter queue (DLQ)
- DLQ is monitored; alerts fire on any DLQ depth > 0
- Idempotency: orchestrator checks whether a turn with the same message ID already exists before processing

---

### Postgres unavailable

**Problem:** Cannot persist conversations or create new customers.

**Mitigation:**
- Active conversations in Redis can continue for up to 24 hours without Postgres
- New customers cannot be created (fail gracefully with "our system is temporarily unavailable")
- All domain events are buffered in SQS and can be replayed once Postgres recovers

---

## Observability

### Metrics to track

| Metric | Alert threshold |
|---|---|
| Agent loop p95 latency | > 6 seconds |
| Anthropic API error rate | > 5% over 5 min |
| SQS DLQ depth | > 0 |
| Redis cache miss rate | > 30% sustained |
| Active call drop rate | > 2% |
| Follow-up task failure rate | > 10% |

### Logging

Every service logs structured JSON. Each log line includes:
- `conversationId` and `customerId` where applicable
- Service name and version
- Request/event ID for tracing

### Distributed tracing

A `traceId` is set at the gateway and propagated through all events and service calls. Enables end-to-end tracing of a single customer message across all services.

---

## Future scaling considerations

**When concurrent calls exceed 100:**
- Move agent service behind a dedicated queue (decouple from orchestrator)
- Consider batching qualification updates to reduce Postgres write volume

**When leads exceed 100k:**
- Add Postgres read replicas for Admin UI and analytics queries
- Partition `conversation_turns` by month
- Move domain event log to a dedicated analytics store (Redshift, BigQuery)

**When adding new channels:**
- Each new channel is a new adapter in `packages/channel-adapters`
- Gateway adds a new webhook route
- No changes needed to Orchestrator, Agent, or downstream services
