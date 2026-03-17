# packages/ai-core

The AI reasoning layer. Wraps the Anthropic API and encapsulates everything specific to how the sales agent thinks and acts.

## Contents

| Module | Description |
|---|---|
| `AGENT_TOOLS` | Tool definitions in Anthropic's JSON schema format |
| `buildSystemPrompt(context)` | Constructs the system prompt from a ConversationContext |
| `runAgentLoop(input)` | Runs the full tool-calling loop and returns a response |

## The agent loop

`runAgentLoop` accepts a context, a new user message, and a `toolExecutor` callback. It calls the Anthropic API in a loop until `stop_reason` is `"end_turn"`, executing tools via the callback on each `"tool_use"` stop. It returns the final response text, all tool calls made, any qualification updates, and whether a handoff was requested.

The `toolExecutor` is provided by the orchestrator — this keeps the agent package free of infrastructure dependencies (no Twilio, no Redis, no Postgres).

## Prompt architecture

The system prompt has three sections injected on every call:

1. **Role and rules** — fixed; defines who the agent is and its behavioural guardrails
2. **Conversation state** — dynamic; active channel, turn count, materials shared, appointment status
3. **Qualification state** — dynamic; what has been collected so far and what to ask next

See [AI Agent Design](../../docs/architecture/06-ai-agent-design.md) for full detail.

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Required |
| `ANTHROPIC_MODEL` | Defaults to `claude-sonnet-4-20250514` |
