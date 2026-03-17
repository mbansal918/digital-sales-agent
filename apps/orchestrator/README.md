# apps/orchestrator

**Role:** The central coordinator. Consumes inbound message events, manages conversation state, calls the agent, and drives all downstream effects.

## Responsibilities

- Resolve raw identifiers (phone numbers) to stable `customerId` UUIDs
- Load or create `ConversationContext` from the context store
- Call the agent service with full context and receive a response
- Execute agent tool calls (send WhatsApp, schedule consultation, trigger handoff)
- Persist updated context and new conversation turns
- Publish downstream lifecycle events (`lead.qualified`, `handoff.requested`, `follow_up.scheduled`)
- Detect call-end without booking and trigger follow-up scheduling

## Events consumed

| Event | Action |
|---|---|
| `channel.message.received` | Main handler — runs full agent loop |
| `call.started` | Pre-loads context for the customer |
| `call.ended` | Checks booking status, schedules follow-up if needed |

## Events published

| Event | When |
|---|---|
| `channel.message.sent` | After agent produces a response |
| `lead.qualified` | When all key qualification fields are filled |
| `handoff.requested` | When agent calls handoff_to_human tool |
| `follow_up.scheduled` | When call ends without booking |
| `appointment.scheduled` | When agent books a consultation |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `REDIS_URL` | Yes | Context store hot tier |
| `DATABASE_URL` | Yes | Context store cold tier |
| `SQS_QUEUE_URL` | Yes | Event bus |
| `ANTHROPIC_API_KEY` | Yes | Passed through to agent service |
| `GATEWAY_BASE_URL` | Yes | Used to construct Cal.com booking links |
| `CALCOM_API_KEY` | Yes | For scheduling tool |

## Key dependencies

- `@dsa/ai-core` — agent loop
- `@dsa/context-store` — Redis context read/write
- `@dsa/db` — Postgres persistence
- `@dsa/event-bus` — consuming and publishing events
- `@dsa/channel-adapters` — sending WhatsApp messages from tool handlers
