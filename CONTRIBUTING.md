# Contributing

## Branch strategy

| Branch | Purpose | Auto-deploys to |
|---|---|---|
| `main` | Production-ready code | Production |
| `develop` | Integration branch | Staging |
| `feature/*` | New features | — |
| `fix/*` | Bug fixes | — |
| `hotfix/*` | Emergency production fixes | — |

Branch from `develop` for all normal work. Branch from `main` only for hotfixes.

## Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(orchestrator): add cross-channel context merging
fix(gateway): validate Twilio webhook signature on all routes
chore(deps): upgrade @anthropic-ai/sdk to 0.25.0
docs(adr): add ADR-005 for scheduling library choice
test(ai-core): add agent loop integration tests
refactor(context-store): extract identity resolution to separate module
```

**Types:** `feat` · `fix` · `chore` · `docs` · `test` · `refactor` · `perf`

**Scopes:** match the service or package name (`gateway`, `orchestrator`, `agent`, `workflow`, `crm-service`, `admin-ui`, `shared-types`, `ai-core`, `context-store`, `event-bus`, `channel-adapters`, `db`, `infra`)

## Pull requests

1. Branch from `develop`
2. Keep PRs focused — one concern per PR
3. All CI checks must pass (typecheck, lint, tests, build)
4. At least one approval required
5. Squash-merge into `develop`
6. Delete branch after merge

## Adding a new channel

1. Add the `Channel` value to `packages/shared-types/src/index.ts`
2. Create a normalizer in `packages/channel-adapters/src/adapters/{channel}.ts`
3. Add outbound send function(s) to `packages/channel-adapters/src/index.ts`
4. Add a webhook route in `apps/gateway/src/index.ts`
5. Update `packages/channel-adapters/README.md`
6. The orchestrator, agent, and all downstream services need no changes

## Adding a new agent tool

1. Add the tool name to `AgentToolName` in `packages/shared-types/src/index.ts`
2. Add the tool definition to `AGENT_TOOLS` in `packages/ai-core/src/index.ts`
3. Add the tool handler to the `toolExecutor` in `apps/orchestrator/src/index.ts`
4. Update `docs/architecture/04-component-contracts.md` with the new tool schema
5. Add tests for the tool handler

## Adding a database migration

1. Create `packages/db/src/migrations/NNN_description.sql`
2. Write idempotent SQL (`IF NOT EXISTS`, `CREATE OR REPLACE`)
3. Run `npm run migrate --filter=@dsa/db` to verify
4. Never modify a migration that has already been applied to any environment

## Local development

```bash
# Start infrastructure
docker compose -f infra/docker/docker-compose.yml up -d

# Install dependencies
npm install

# Run all services in watch mode
npm run dev

# Run a single service
npm run dev --filter=@dsa/gateway

# Run tests
npm test

# Typecheck everything
npm run typecheck
```
