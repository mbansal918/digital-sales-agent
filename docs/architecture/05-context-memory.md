# 05 — Context & Memory Design

## The problem

A customer may call today, receive a WhatsApp follow-up tomorrow, and call again next week. Every interaction must feel continuous — the agent must remember what was discussed, what materials were sent, and how far along the qualification process is — without the customer having to repeat themselves.

At the same time, context must load fast enough to fit inside a live voice call, where any delay becomes an audible pause.

---

## Two-tier storage

```
Incoming message
      │
      ▼
Redis (hot tier)         ← primary read path (sub-5ms)
  ctx:{conversationId}      ConversationContext, 24h TTL
  identity:{identifier}     phone/email → customerId
  active:{customerId}       customerId → active conversationId
      │
      │ async write-through
      ▼
PostgreSQL (cold tier)   ← durable record
  conversations             conversation metadata
  conversation_turns        every individual message
  customers                 customer profile
  lead_qualification        qualification data (upserted)
  domain_events             append-only event log
```

**Why two tiers?**

| Concern | Redis | Postgres |
|---|---|---|
| Read latency | ~1ms | ~5-20ms |
| TTL / expiry | Native | Requires job |
| Durability | Volatile (can lose data on restart without AOF) | ACID |
| Query flexibility | Key-value only | Full SQL |
| Cost at scale | Higher per GB | Lower per GB |

Redis handles the hot path. Postgres is the source of truth. If Redis is cold (cache miss), the orchestrator rehydrates from Postgres and re-warms Redis.

---

## ConversationContext object

This is the object that Redis stores and the Agent receives on every call.

```typescript
interface ConversationContext {
  conversationId: string;
  customerId: string;
  activeChannel: Channel;
  turns: ConversationTurn[];        // recent turns only (see windowing below)
  qualification: LeadQualification; // latest snapshot
  materialsShared: string[];        // e.g. ["brochure", "project_photos"]
  appointmentScheduled?: string;    // Cal.com booking ID
  handoffRequested: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Context windowing

The full conversation history is stored in Postgres but only the most recent N turns are loaded into the context window sent to the LLM. This prevents token bloat and cost explosion on long-running leads.

**Default window:** last 20 turns.

**What is always included regardless of window:**
- Full qualification data (LeadQualification)
- materialsShared list
- appointmentScheduled flag
- handoffRequested flag

These are structured data fields extracted from the conversation — they persist forever and are always injected into the agent's system prompt, even if the raw turn text is no longer in the window.

---

## Identity resolution

A single real person may have multiple identifiers:
- Voice number: `+12065551234`
- WhatsApp number: `+12065559876` (different SIM)
- Email: `jane@example.com`

The system maps all known identifiers to a single `customerId`.

**Resolution flow:**

```
Inbound identifier (phone/email)
        │
        ▼
Redis: GET identity:{identifier}
        │
    found?──────────────── yes → customerId
        │
        no
        │
        ▼
Postgres: SELECT id FROM customers WHERE phone=$1 OR whatsapp=$1 OR email=$1
        │
    found?──────────────── yes → cache in Redis, return customerId
        │
        no
        │
        ▼
Create new Customer record → cache in Redis → return new customerId
```

**Cross-channel linking:** When a customer provides their email during a voice call, the orchestrator immediately binds `identity:{email}` → `customerId` so that any future email interaction is recognised as the same person.

---

## Context lifecycle

| Event | Action |
|---|---|
| First contact | Create Customer, create ConversationContext, save to Redis + Postgres |
| Message received | Load from Redis (or rehydrate from Postgres), run agent, save updated context |
| Call ends | Persist final context to Postgres, keep in Redis (24h TTL) |
| Customer returns within 24h | Load from Redis (fast path) |
| Customer returns after 24h | Load from Postgres, re-warm Redis |
| Lead closed (won/lost) | Archive context; remove from Redis |

---

## Cache invalidation

The orchestrator is the single writer of context. No other service writes directly to Redis context keys. This eliminates race conditions.

For customer profile data (name, status, hubspotId), the CRM service updates Postgres and publishes `lead.status_changed`. The orchestrator invalidates the Redis customer cache on receipt.

---

## Failure handling

**Redis unavailable:** The orchestrator falls back to Postgres for context reads. Writes are queued in memory for retry. Voice calls may experience slightly higher latency but will not fail.

**Redis context miss (TTL expired):** The orchestrator rehydrates from Postgres (loads last 20 turns + full qualification) and re-warms Redis before responding.

**Postgres unavailable:** The orchestrator uses Redis as a read-only fallback for active conversations. New customers cannot be created. A circuit breaker prevents cascading failures.
