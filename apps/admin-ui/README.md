# apps/admin-ui

**Role:** Internal operations dashboard for sales and ops teams. Provides visibility into the lead pipeline, conversation history, follow-up queue, and channel activity.

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — key metrics, daily leads chart, funnel overview |
| `/leads` | Lead pipeline — filterable list with status, project type, urgency |
| `/leads/:id` | Lead detail — full profile, qualification data, conversation history |
| `/conversations` | All conversations with channel filter and search |
| `/campaigns` | Follow-up task queue — pending, sent, failed tasks |
| `/settings` | Message templates, agent behaviour config (future) |

## Data sources

The Admin UI calls the **CRM Service REST API** only. It does not access Redis or Postgres directly. This keeps a clean boundary and means the Admin UI can be given to contractors or external staff without exposing infrastructure credentials.

## Tech stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Recharts** for pipeline and activity charts
- **date-fns** for date formatting

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CRM_API_URL` | Yes | Base URL of the CRM Service |
| `NEXTAUTH_SECRET` | Yes | For session signing (add auth before exposing externally) |
| `ADMIN_UI_PORT` | No | Defaults to 4000 |

## Security note

The Admin UI should sit behind authentication before being deployed to any environment accessible outside the internal network. Recommended: add NextAuth with Google or Okta SSO.
