# 04 — Component Contracts

This document defines the interfaces between components: event schemas, internal REST APIs, and agent tool schemas. These are the contracts that must be honoured when implementing each service.

---

## Event schemas

All events share a common envelope:

```typescript
interface DomainEvent<T> {
  id: string;               // UUID, unique per event
  type: EventType;          // see list below
  customerId: string;       // always present
  conversationId?: string;  // present when tied to a specific conversation
  payload: T;               // event-specific data
  occurredAt: Date;
  source: string;           // service name that emitted this
}
```

---

### `channel.message.received`

Emitted by: **Gateway**
Consumed by: **Orchestrator**

```typescript
payload: {
  id: string;               // message ID
  channel: Channel;
  direction: 'inbound';
  customerId: string;       // raw identifier (phone/email) — Orchestrator resolves to UUID
  content: string;          // text content (speech transcript for voice)
  mediaUrls?: string[];
  metadata: {
    callSid?: string;       // voice only
    messageSid?: string;    // WhatsApp/SMS only
    [key: string]: unknown;
  };
}
```

---

### `channel.message.sent`

Emitted by: **Orchestrator**
Consumed by: **Gateway** (to deliver TwiML or send WhatsApp message)

```typescript
payload: {
  customerId: string;
  conversationId: string;
  channel: Channel;
  content: string;
  callSid?: string;         // voice: gateway uses this to match the pending Twilio response
  mediaUrl?: string;        // if message includes media
}
```

---

### `call.started`

Emitted by: **Gateway**
Consumed by: **Orchestrator**

```typescript
payload: {
  callSid: string;
  from: string;             // customer phone number
  to: string;               // company number
  direction: 'inbound' | 'outbound';
}
```

---

### `call.ended`

Emitted by: **Gateway**
Consumed by: **Orchestrator**

```typescript
payload: {
  callSid: string;
  duration: string;         // seconds as string (Twilio format)
  callStatus: string;       // 'completed' | 'no-answer' | 'busy' | 'failed'
}
```

---

### `lead.qualified`

Emitted by: **Orchestrator**
Consumed by: **CRM Service**, **Workflow Engine**

```typescript
payload: {
  qualification: LeadQualification;  // full snapshot
}
```

---

### `lead.status_changed`

Emitted by: **CRM Service**
Consumed by: **Workflow Engine**

```typescript
payload: {
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
  hubspotContactId?: string;
}
```

---

### `handoff.requested`

Emitted by: **Orchestrator**
Consumed by: **CRM Service**

```typescript
payload: {
  reason: string;
  urgency: 'normal' | 'high';
  conversationSummary?: string;  // brief summary for the human rep
}
```

---

### `follow_up.scheduled`

Emitted by: **Orchestrator**
Consumed by: **Workflow Engine**

```typescript
payload: {
  trigger: WorkflowTrigger;
  channel: Channel;
  templateId: string;
}
```

---

### `appointment.scheduled`

Emitted by: **Orchestrator** (when agent schedules via tool)
Consumed by: **CRM Service**, **Workflow Engine**

```typescript
payload: {
  bookingId: string;        // Cal.com booking ID
  scheduledFor: string;     // ISO 8601
  consultationType: 'phone' | 'site_visit' | 'video';
}
```

---

## Internal REST APIs

### CRM Service — `/leads`

Used by the Admin UI.

```
GET  /leads              List leads with pagination and status filter
GET  /leads/:id          Single lead with full qualification + conversation list
GET  /leads/:id/conversations/:convId   Conversation turns

Query params:
  status=qualified       Filter by LeadStatus
  limit=50               Page size
  offset=0               Pagination offset

Response (list):
{
  "leads": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "phone": "+12065551234",
      "status": "qualified",
      "projectType": "residential_renovation",
      "urgency": "high",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 142
}
```

### Workflow Service — `/tasks`

```
GET  /tasks              List follow-up tasks (for admin visibility)
POST /tasks/:id/cancel   Cancel a pending task
```

### Gateway — `/health`

```
GET  /health   → { "status": "ok", "ts": "ISO timestamp" }
```

All services expose `/health` for load balancer health checks.

---

## Agent tool schemas

These are the exact JSON schemas the LLM uses to call tools. They must match the implementation in `packages/ai-core`.

### `update_qualification`

```json
{
  "name": "update_qualification",
  "description": "Update the lead qualification data based on what the customer has shared. Call this whenever you learn a new qualification fact.",
  "input_schema": {
    "type": "object",
    "properties": {
      "projectType":      { "type": "string", "enum": ["residential_renovation","commercial_construction","new_build","repair","other"] },
      "propertyType":     { "type": "string", "enum": ["residential","commercial"] },
      "location":         { "type": "string" },
      "budgetMin":        { "type": "number" },
      "budgetMax":        { "type": "number" },
      "timeline":         { "type": "string" },
      "isDecisionMaker":  { "type": "boolean" },
      "urgency":          { "type": "string", "enum": ["low","medium","high"] },
      "additionalNotes":  { "type": "string" }
    }
  }
}
```

### `send_media_to_customer`

```json
{
  "name": "send_media_to_customer",
  "description": "Send a brochure, project photos, pricing guide, or booking link to the customer via WhatsApp or email. Use this during a voice call to send companion materials.",
  "input_schema": {
    "type": "object",
    "required": ["mediaType", "channel"],
    "properties": {
      "mediaType": { "type": "string", "enum": ["brochure","project_photos","testimonials","pricing_guide","financing_options","booking_link"] },
      "channel":   { "type": "string", "enum": ["whatsapp","email"] },
      "message":   { "type": "string", "description": "Short message to accompany the media." }
    }
  }
}
```

### `schedule_consultation`

```json
{
  "name": "schedule_consultation",
  "description": "Send the customer a consultation booking link or confirm an appointment. Use when the customer expresses readiness to meet.",
  "input_schema": {
    "type": "object",
    "required": ["deliveryChannel"],
    "properties": {
      "deliveryChannel":   { "type": "string", "enum": ["whatsapp","email","voice"] },
      "preferredDate":     { "type": "string", "description": "ISO 8601 date if the customer specified one." },
      "consultationType":  { "type": "string", "enum": ["phone","site_visit","video"] }
    }
  }
}
```

### `handoff_to_human`

```json
{
  "name": "handoff_to_human",
  "description": "Transfer the conversation to a human sales representative. Use when the lead is highly qualified, requests a detailed estimate, asks a question outside your knowledge, or the conversation is too complex.",
  "input_schema": {
    "type": "object",
    "required": ["reason"],
    "properties": {
      "reason":   { "type": "string" },
      "urgency":  { "type": "string", "enum": ["normal","high"] }
    }
  }
}
```

### `get_customer_context`

```json
{
  "name": "get_customer_context",
  "description": "Retrieve the recent conversation history and qualification summary for a returning customer.",
  "input_schema": {
    "type": "object",
    "required": ["customerId"],
    "properties": {
      "customerId": { "type": "string" }
    }
  }
}
```
