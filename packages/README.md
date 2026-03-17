# packages/

Shared libraries. These are not deployed independently — they are consumed by services in `apps/` as npm workspace dependencies.

| Package | Description |
|---|---|
| `shared-types` | TypeScript domain types shared across all services |
| `ai-core` | Anthropic LLM client, system prompt builder, tool definitions, agent loop |
| `context-store` | Redis + Postgres context abstraction — the only code that touches these stores |
| `event-bus` | SQS FIFO publisher and consumer SDK |
| `channel-adapters` | Twilio Voice, WhatsApp normalizers and TwiML/send helpers |
| `db` | Postgres pool client, repositories, and migration runner |

## Dependency rules

Packages may depend on other packages, but never on apps. The dependency graph must be acyclic.

```
shared-types   ← (no dependencies on other packages)
ai-core        ← shared-types
context-store  ← shared-types
event-bus      ← shared-types
channel-adapters ← shared-types
db             ← shared-types
```

No package depends on another package except `shared-types`. This keeps the graph flat and avoids circular dependencies.
