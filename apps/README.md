# apps/

Deployable services. Each app is an independently containerised process with its own Dockerfile, environment variables, and deployment unit.

| Service | Port | Description |
|---|---|---|
| `gateway` | 3000 | Receives inbound webhooks from Twilio and other channels; routes to event bus |
| `orchestrator` | — | Event-driven conversation state machine; the central coordinator |
| `agent` | 8000 | Stateless AI engine; runs the LLM tool-calling loop |
| `workflow` | 3002 | Schedules and sends follow-up campaigns |
| `crm-service` | 3003 | Syncs qualified leads and handoffs to HubSpot |
| `admin-ui` | 4000 | Next.js internal dashboard for sales and ops teams |

Each service has its own README with setup, configuration, and local dev instructions.
