# 01 — System Overview

## Purpose

This document describes the end-to-end architecture of the Digital Sales Agent: what the system does, how it is divided into layers and components, and why those divisions exist.

---

## System goals

1. Engage construction leads across Voice, WhatsApp, Email, and Web Chat from a single AI brain.
2. Maintain a continuous, cross-channel conversation history so customers never have to repeat themselves.
3. Qualify leads automatically by collecting structured project data through natural conversation.
4. Send supporting materials (brochures, photos, pricing guides) to a customer's WhatsApp while they are still on a call (companion messaging).
5. Schedule consultations and follow up automatically when leads go quiet.
6. Hand off to a human sales rep with full context at exactly the right moment.

---

## Architecture tiers

The system is organized into five horizontal tiers. Each tier has a single, clear responsibility.

```
┌─────────────────────────────────────────────────────────────┐
│  CHANNEL TIER                                               │
│  Voice · WhatsApp · Email · Web Chat                        │
│  (raw inbound/outbound signals)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ normalized events
┌──────────────────────▼──────────────────────────────────────┐
│  ROUTING TIER                                               │
│  API Gateway  ←→  Event Bus (SQS FIFO)                      │
│  (auth, rate-limiting, fan-out)                             │
└──────────┬───────────────────────────┬───────────────────────┘
           │ sync (webhooks)            │ async (events)
┌──────────▼──────────┐   ┌────────────▼──────────────────────┐
│  CORE SERVICES      │   │  CORE SERVICES (async consumers)  │
│  Orchestrator       │   │  Agent · Workflow · CRM Service   │
│  (conversation fsm) │   │                                   │
└──────────┬──────────┘   └────────────┬──────────────────────┘
           │                           │
┌──────────▼───────────────────────────▼───────────────────────┐
│  DATA TIER                                                   │
│  Redis (hot context) · Postgres (durable) · S3 (media)       │
└──────────────────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────┐
│  INTEGRATION TIER                                            │
│  Twilio · Anthropic API · HubSpot · Cal.com                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Components

### Channel Tier

| Component | Technology | Responsibility |
|---|---|---|
| Voice | Twilio Voice + TwiML | Inbound/outbound calls, speech-to-text, text-to-speech |
| WhatsApp | Twilio Conversations | Bidirectional messaging, media delivery |
| Email | SendGrid (phase 2) | Outbound campaigns and replies |
| Web Chat | Socket.io widget (phase 2) | Real-time chat on company website |

All channels produce a normalized `ChannelMessage` event. No business logic lives here.

---

### Routing Tier

**API Gateway** (`apps/gateway`)
- Receives raw Twilio/SendGrid/chat webhooks over HTTPS
- Validates signatures (Twilio HMAC, API key for internal calls)
- Normalizes payloads into `ChannelMessage` via channel adapters
- Publishes events to the Event Bus
- Returns synchronous TwiML responses for voice (mandatory for Twilio)

**Event Bus** (`packages/event-bus`)
- AWS SQS FIFO queue
- All inter-service communication flows through it
- FIFO ordering is per-customer (MessageGroupId = customerId), so a customer's events are always processed in order
- Dead-letter queue after 3 failed processing attempts

---

### Core Services

**Orchestrator** (`apps/orchestrator`)
- The central coordinator. Consumes `channel.message.received` events.
- Resolves the incoming identifier (phone number / email) to a stable `customerId`
- Loads or creates the `ConversationContext` for this customer from the context store
- Calls the Agent service to get a response
- Persists updated context and new conversation turns
- Publishes outbound message events and downstream lifecycle events (e.g. `lead.qualified`)
- Triggers follow-up scheduling when a call ends without a booking

**Agent** (`apps/agent`)
- Stateless AI engine. Accepts a `ConversationContext` + new message, returns a response.
- Runs an agentic tool-calling loop against the Anthropic API
- Exposes available tools: `update_qualification`, `send_media_to_customer`, `schedule_consultation`, `handoff_to_human`, `get_customer_context`
- Has no knowledge of channels or infrastructure — pure reasoning
- See [AI Agent Design](./06-ai-agent-design.md) for full detail

**Workflow Engine** (`apps/workflow`)
- Consumes lifecycle events (`call.ended`, `lead.qualified`, `lead.status_changed`)
- Schedules and executes follow-up tasks (WhatsApp messages, email reminders)
- Runs a polling loop to send tasks when their scheduled time arrives
- In production: backed by Postgres + pg-boss for durable scheduling

**CRM Service** (`apps/crm-service`)
- Consumes `lead.qualified` and `handoff.requested` events
- Upserts contacts and deals in HubSpot
- Creates handoff tasks assigned to human reps
- Exposes a REST API for the Admin UI to query lead and pipeline data

**Admin UI** (`apps/admin-ui`)
- Next.js internal dashboard for the sales and ops teams
- Shows lead pipeline, conversation history, follow-up queue, channel activity
- Calls the CRM Service and Orchestrator APIs — no direct database access

---

### Data Tier

| Store | Technology | What lives here |
|---|---|---|
| Hot context | Redis | Active `ConversationContext` objects (24h TTL), identity mappings, active conversation pointers |
| Durable store | PostgreSQL | Customers, conversations, turns, lead qualification, follow-up tasks, domain event log |
| Media store | AWS S3 + CloudFront | Brochures, project photos, pricing guides, testimonials |

See [Context & Memory Design](./05-context-memory.md) for the full strategy.

---

### Integration Tier

| Integration | Purpose | Package |
|---|---|---|
| Twilio Voice | Calls, TwiML | `packages/channel-adapters` |
| Twilio WhatsApp | Messaging, media | `packages/channel-adapters` |
| Anthropic API | LLM reasoning | `packages/ai-core` |
| HubSpot | CRM sync, deal tracking | `apps/crm-service` |
| Cal.com | Booking link generation | `apps/orchestrator` (tool handler) |

---

## Key design principles

**Events are the integration backbone.** Services never call each other directly over HTTP (except the Admin UI calling the CRM API). All cross-service communication flows through the event bus. This means any service can be replaced, scaled, or taken down without affecting others.

**The Agent is stateless.** The agent service receives full context on every call. It makes no database calls and holds no state. This makes it trivially scalable and independently testable.

**Context is cheap to read, expensive to lose.** Redis provides sub-millisecond context reads on the hot path. Postgres ensures nothing is ever truly lost. See [Context & Memory Design](./05-context-memory.md).

**Channels are thin adapters.** No business logic lives in the channel layer. The same `ConversationContext` and Agent respond regardless of whether the customer is on a call or sending a WhatsApp message.
