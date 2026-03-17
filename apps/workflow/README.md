# apps/workflow

**Role:** Schedules and executes automated follow-up messages. Consumes lifecycle events to create follow-up tasks, then sends them at the right time via WhatsApp or email.

## Responsibilities

- Listen for lifecycle events that trigger follow-ups (`call.ended`, `lead.qualified`, `lead.status_changed`)
- Create `FollowUpTask` records with the appropriate delay and template
- Poll for due tasks and execute them (send WhatsApp/email)
- Publish `follow_up.sent` on success

## Follow-up triggers and defaults

| Trigger | Delay | Template | Channel |
|---|---|---|---|
| `call_ended_no_booking` | +1 hour | `follow-up-no-booking` | WhatsApp |
| `no_response_48h` | +48 hours | `follow-up-48h` | WhatsApp |
| `consultation_reminder` | -24 hours | `consultation-reminder` | WhatsApp |
| `post_consultation` | +1 hour | `post-consultation` | WhatsApp |

## Production note

The MVP uses an in-memory task queue with a polling interval. For production, replace with **pg-boss** (Postgres-backed job queue) to survive service restarts and support multiple worker instances.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `SQS_QUEUE_URL` | Yes | Event bus |
| `TWILIO_WHATSAPP_NUMBER` | Yes | For sending follow-ups |
| `TWILIO_AUTH_TOKEN` | Yes | |
| `DATABASE_URL` | Yes | For durable task persistence (production) |
| `WORKFLOW_PORT` | No | Defaults to 3002 |

## Key dependencies

- `@dsa/event-bus` — consuming lifecycle events, publishing follow_up.sent
- `@dsa/channel-adapters` — sending WhatsApp messages
- `@dsa/db` — persisting and querying follow-up tasks
