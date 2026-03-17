# apps/crm-service

**Role:** Bridges the sales agent system with HubSpot. Syncs qualified leads, creates deals, and creates handoff tasks for human sales reps.

## Responsibilities

- Consume `lead.qualified` → upsert HubSpot contact + create deal
- Consume `handoff.requested` → create high-priority HubSpot task for sales rep
- Consume `appointment.scheduled` → update deal stage in HubSpot
- Publish `lead.status_changed` after successful CRM sync
- Expose REST API for the Admin UI to query lead and pipeline data

## HubSpot objects managed

| Object | When created/updated |
|---|---|
| Contact | On `lead.qualified` — phone, email, name, company |
| Deal | On `lead.qualified` — project type, budget, location, timeline |
| Task | On `handoff.requested` — assigned to next available rep |
| Deal stage | On `appointment.scheduled` → moves to "Appointment Scheduled" |

## REST API (for Admin UI)

```
GET /leads                   Paginated lead list with status filter
GET /leads/:id               Single lead with full qualification data
GET /leads/:id/conversations  Conversation list for a lead
GET /health
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `HUBSPOT_API_KEY` | Yes | HubSpot private app token |
| `SQS_QUEUE_URL` | Yes | Event bus |
| `DATABASE_URL` | Yes | For lead queries from Admin UI |
| `CRM_SERVICE_PORT` | No | Defaults to 3003 |

## Key dependencies

- `@dsa/event-bus` — consuming events, publishing lead.status_changed
- `@dsa/db` — customer and qualification queries for Admin UI API
- `@dsa/shared-types` — LeadQualification, Customer types
