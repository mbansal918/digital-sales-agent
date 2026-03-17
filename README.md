# Digital Sales Agent

An AI-powered omnichannel sales agent for construction businesses. Engages customers across Voice, WhatsApp, Email, and Web Chat — maintaining context across all channels, qualifying leads, scheduling consultations, and handing off to human reps at the right moment.

---

## Repository layout

```
digital-sales-agent/
│
├── apps/                        # Deployable services
│   ├── gateway/                 # Inbound webhook receiver & channel router
│   ├── orchestrator/            # Conversation state machine
│   ├── agent/                   # AI engine (LLM calls, tool use)
│   ├── workflow/                # Campaign & follow-up scheduler
│   ├── crm-service/             # Lead lifecycle & CRM sync
│   └── admin-ui/                # Internal ops dashboard
│
├── packages/                    # Shared libraries (not deployed independently)
│   ├── shared-types/            # TypeScript domain types used across all services
│   ├── ai-core/                 # LLM client, prompts, tool definitions
│   ├── context-store/           # Redis + Postgres conversation context abstraction
│   ├── event-bus/               # SQS publisher/consumer SDK
│   ├── channel-adapters/        # Twilio Voice, WhatsApp, Email, Chat normalizers
│   └── db/                      # Postgres client, repositories, migrations
│
├── infra/                       # Infrastructure as code
│   ├── terraform/               # AWS resources (ECS, RDS, ElastiCache, SQS, S3)
│   ├── k8s/                     # Kubernetes manifests (alternative to ECS)
│   └── docker/                  # Local development Docker Compose stack
│
└── docs/                        # Design documentation
    ├── architecture/            # System design, data flows, component contracts
    └── decisions/               # Architecture Decision Records (ADRs)
```

---

## Documentation

| Document | Description |
|---|---|
| [System Architecture](./docs/architecture/01-system-overview.md) | End-to-end architecture, tiers, and component responsibilities |
| [Data Flow](./docs/architecture/02-data-flow.md) | How a message travels from channel to agent and back |
| [Domain Model](./docs/architecture/03-domain-model.md) | Core entities, their relationships, and lifecycle states |
| [Component Contracts](./docs/architecture/04-component-contracts.md) | Event schemas, internal API shapes, and tool definitions |
| [Context & Memory Design](./docs/architecture/05-context-memory.md) | How conversation context is stored, retrieved, and expired |
| [AI Agent Design](./docs/architecture/06-ai-agent-design.md) | Agent loop, tool strategy, prompt architecture, safety guardrails |
| [Scalability & Resilience](./docs/architecture/07-scalability.md) | Scaling strategy, failure modes, and recovery patterns |
| [ADR-001: Monorepo](./docs/decisions/ADR-001-monorepo.md) | Why a monorepo with Turborepo |
| [ADR-002: Event Bus](./docs/decisions/ADR-002-event-bus.md) | Why SQS FIFO over Kafka for the MVP |
| [ADR-003: Context Store](./docs/decisions/ADR-003-context-store.md) | Why Redis + Postgres (two-tier) over a single store |
| [ADR-004: Agent Loop](./docs/decisions/ADR-004-agent-loop.md) | Why a tool-calling loop over a single prompt |

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env
# Fill in credentials (see .env.example for required keys)

# 3. Start local infrastructure (Postgres, Redis, LocalStack)
docker compose -f infra/docker/docker-compose.yml up -d

# 4. Run all services in dev mode
npm run dev
```

See each service's README for individual setup and configuration details.

---

## MVP scope

- [x] Outbound voice calls (Twilio)
- [x] Inbound callback handling
- [x] WhatsApp companion messaging during calls
- [x] Lead qualification (structured data collection)
- [x] Consultation scheduling (Cal.com booking links)
- [x] Cross-channel context retention
- [x] Automated follow-up workflows
- [x] Human handoff with conversation summary
- [ ] Email integration *(phase 2)*
- [ ] Web chat integration *(phase 2)*
- [ ] Advanced analytics & campaign optimization *(phase 3)*
