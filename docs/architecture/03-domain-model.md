# 03 — Domain Model

This document defines the core entities, their fields, relationships, and lifecycle states.

---

## Entity map

```
Customer ──< Conversation ──< ConversationTurn
    │
    └──< LeadQualification (1:1)
    └──< FollowUpTask (1:many)

DomainEvent (append-only log, references Customer + Conversation)
```

---

## Customer

The central entity. Represents a single real-world person regardless of which channel they contact us on.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Stable internal identifier |
| phone | string? | E.164 format e.g. `+12065551234` |
| whatsapp | string? | E.164; may differ from voice number |
| email | string? | |
| name | string? | Captured during conversation |
| companyName | string? | For commercial leads |
| status | LeadStatus | See lifecycle below |
| hubspotContactId | string? | Set once synced to HubSpot |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**Identity resolution:** A customer may contact us via different channels at different times. The system resolves all known identifiers (phone, WhatsApp number, email) to a single `customerId` via the identity map in Redis, backed by Postgres.

---

## LeadStatus lifecycle

```
new → contacted → qualifying → qualified → consultation_scheduled → closed_won
                                                                  → closed_lost
                     ↓
                  nurturing  (went quiet, in follow-up sequence)
```

| Status | Meaning |
|---|---|
| `new` | Lead created, not yet reached |
| `contacted` | First contact made (call answered or message replied to) |
| `qualifying` | Active conversation, collecting qualification data |
| `qualified` | All key qualification fields collected |
| `consultation_scheduled` | Booking confirmed |
| `closed_won` | Deal signed |
| `closed_lost` | Lead opted out or disqualified |
| `nurturing` | Went quiet; in automated follow-up sequence |

---

## LeadQualification

A 1:1 child of Customer. Updated incrementally as the agent gathers information across multiple conversations.

| Field | Type | Notes |
|---|---|---|
| projectType | enum | `residential_renovation`, `commercial_construction`, `new_build`, `repair`, `other` |
| propertyType | enum | `residential`, `commercial` |
| location | string | City/region |
| budgetRange | { min, max, currency } | Self-reported range |
| timeline | string | e.g. "within 3 months", "next year" |
| isDecisionMaker | boolean | Is this person the one who signs off? |
| urgency | enum | `low`, `medium`, `high` |
| additionalNotes | string | Anything else captured |

**Qualification completeness:** A lead is considered `qualified` when `projectType`, `budgetRange`, and `isDecisionMaker` are all set. This triggers the `lead.qualified` event.

---

## Conversation

One continuous thread of interaction. A single customer may have multiple conversations over time (e.g. initial inquiry, follow-up call weeks later).

| Field | Type | Notes |
|---|---|---|
| id | UUID | Also used as the Twilio CallSid for voice conversations |
| customerId | UUID | FK to Customer |
| activeChannel | Channel | The channel most recently used |
| turns | ConversationTurn[] | Ordered list of messages |
| qualification | LeadQualification | Snapshot at time of context load |
| materialsShared | string[] | e.g. `["brochure", "project_photos"]` |
| appointmentScheduled | string? | Cal.com booking ID once confirmed |
| handoffRequested | boolean | Whether human handoff was triggered |
| createdAt / updatedAt | timestamp | |

---

## ConversationTurn

An individual message within a conversation.

| Field | Type | Notes |
|---|---|---|
| role | `agent` \| `customer` | Who sent this message |
| content | string | Text content |
| channel | Channel | Which channel this turn came through |
| timestamp | timestamp | |
| toolCalls | AgentToolCall[]? | Any tool calls made during this agent turn |

---

## Channel

```typescript
type Channel = 'voice' | 'whatsapp' | 'email' | 'web_chat' | 'sms'
```

A single conversation can have turns from multiple channels. For example: the customer is called on Voice, the agent sends materials via WhatsApp, and the customer follows up via WhatsApp the next day — all part of the same conversation.

---

## FollowUpTask

A scheduled outbound message to a customer.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| customerId | UUID | |
| trigger | WorkflowTrigger | Why this task was created |
| channel | Channel | How to send it |
| scheduledFor | timestamp | When to send |
| templateId | string | Which message template to use |
| status | `pending` \| `sent` \| `failed` \| `cancelled` | |

---

## DomainEvent

Append-only log of all significant things that happened. Never deleted or updated.

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| type | EventType | e.g. `lead.qualified`, `call.ended` |
| customerId | UUID? | |
| conversationId | UUID? | |
| payload | JSON | Event-specific data |
| source | string | Which service emitted this |
| occurredAt | timestamp | |

This log is the source of truth for auditing, debugging, and analytics.

---

## AgentToolCall

Records what tools the agent used during a turn — stored within a ConversationTurn for auditability.

| Field | Type | Notes |
|---|---|---|
| tool | AgentToolName | Which tool was called |
| input | JSON | What the agent passed in |
| output | JSON? | What the tool returned |
| timestamp | timestamp | |

### Available tools

| Tool | Purpose |
|---|---|
| `update_qualification` | Write new qualification fields to the customer record |
| `send_media_to_customer` | Send a brochure, photo set, or pricing guide via WhatsApp or email |
| `schedule_consultation` | Send a Cal.com booking link or directly schedule |
| `handoff_to_human` | Trigger handoff with reason and urgency |
| `get_customer_context` | Retrieve prior conversation history for context recall |
