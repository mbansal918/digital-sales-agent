# docs/

Design documentation for the Digital Sales Agent system.

## Architecture docs (`docs/architecture/`)

Sequential documents that build a complete picture of the system design. Read in order for the full context.

| # | Document | What it covers |
|---|---|---|
| 01 | [System Overview](./architecture/01-system-overview.md) | Tiers, components, and design principles |
| 02 | [Data Flow](./architecture/02-data-flow.md) | End-to-end message traces for each major scenario |
| 03 | [Domain Model](./architecture/03-domain-model.md) | Entities, fields, relationships, and lifecycle states |
| 04 | [Component Contracts](./architecture/04-component-contracts.md) | Event schemas, REST API shapes, agent tool definitions |
| 05 | [Context & Memory Design](./architecture/05-context-memory.md) | Two-tier store, windowing, identity resolution |
| 06 | [AI Agent Design](./architecture/06-ai-agent-design.md) | Agent loop, prompt architecture, tools, guardrails |
| 07 | [Scalability & Resilience](./architecture/07-scalability.md) | Scaling model, failure modes, observability |

## Architecture Decision Records (`docs/decisions/`)

Each ADR documents a significant design decision: the context, what was decided, why, and what trade-offs were accepted.

| ADR | Decision |
|---|---|
| [ADR-001](./decisions/ADR-001-monorepo.md) | Monorepo with Turborepo over polyrepo |
| [ADR-002](./decisions/ADR-002-event-bus.md) | SQS FIFO over Kafka for MVP |
| [ADR-003](./decisions/ADR-003-context-store.md) | Two-tier context store (Redis + Postgres) |
| [ADR-004](./decisions/ADR-004-agent-loop.md) | Tool-calling loop over single prompt |

## Adding a new ADR

When making a significant architectural decision (new infrastructure, changing an integration, altering the data model), write an ADR:

1. Copy the format from an existing ADR
2. Name it `ADR-NNN-short-description.md` (next sequential number)
3. Fill in: Context, Decision, Reasons, Trade-offs accepted, Alternatives considered
4. Add it to the table above
