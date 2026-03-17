# apps/agent

**Role:** Stateless AI engine. Accepts a conversation context and a new customer message; returns a response and a list of tool calls to execute. Makes no database calls and holds no state between requests.

## Responsibilities

- Build the system prompt from the conversation context
- Run the Anthropic tool-calling loop (up to 6 iterations)
- Return the final text response, tool calls made, updated qualification fields, and handoff flag

## Why this is a separate service (not just a package)

Separating the agent into its own service allows it to be scaled independently of the orchestrator. LLM calls are slow and CPU-light — scaling agent replicas while keeping the orchestrator at a lower count is an important operational lever.

It also creates a clean boundary: the agent has no database credentials, no Twilio credentials, and no access to infrastructure. If the agent is ever compromised or produces unexpected behaviour, it cannot directly affect data stores.

## API

```
POST /run
Content-Type: application/json

{
  "context": ConversationContext,
  "userMessage": string
}

Response:
{
  "response": string,
  "toolCallsMade": AgentToolCall[],
  "updatedQualification": Partial<LeadQualification>,
  "handoffRequested": boolean
}
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-sonnet-4-20250514` |
| `AGENT_PORT` | No | Defaults to 8000 |

## Key dependencies

- `@dsa/ai-core` — LLM client, system prompt builder, tool definitions
- `@dsa/shared-types` — ConversationContext, AgentToolCall types
