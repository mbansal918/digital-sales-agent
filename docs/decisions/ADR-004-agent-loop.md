# ADR-004 — Tool-calling loop over single prompt

**Status:** Accepted
**Date:** 2025-01

---

## Context

The AI agent needs to do multiple things in a single turn: understand the customer's message, update qualification data, possibly send media, possibly schedule a consultation, and produce a natural language response. We need to decide whether to handle this with a single large prompt or an agentic tool-calling loop.

## Decision

Use an **agentic tool-calling loop** where each action the agent takes (update qualification, send media, schedule, hand off) is a discrete tool call that the orchestrator executes.

## Reasons

**Actions must have real-world side effects.** Sending a WhatsApp message, creating a HubSpot deal, and scheduling a consultation are not things a language model can do by generating text — they require API calls. Tools are the correct abstraction for this.

**Separation of concerns.** The agent reasons about what to do; the orchestrator executes it. This means:
- Tools can be tested independently of the LLM
- Tool execution can fail and be retried without re-running the LLM
- The agent has no credentials and no side-effect access — only reasoning access

**Incremental qualification is natural with tools.** The agent does not need to collect all qualification fields at once. It calls `update_qualification` whenever it learns a new fact — even mid-sentence if the customer volunteers information. This is more natural than trying to parse a structured output from a single-prompt response.

**Auditability.** Every tool call is logged with its input and output. We have a complete audit trail of what the agent did and why, without having to reconstruct it from free text.

**The Anthropic tool use API is well-suited for this.** Claude's tool use is reliable, and the `stop_reason: "tool_use"` / `stop_reason: "end_turn"` loop is a clean pattern with predictable behaviour.

## Trade-offs accepted

- **Latency per tool call.** Each tool use adds one LLM round trip. Mitigated by capping the loop at 6 iterations and targeting p95 completion in < 4 seconds.
- **Cost.** Multiple API calls per turn costs more than a single call. At MVP scale (hundreds of conversations/day), the cost difference is negligible. At 100k conversations/day, revisit.
- **Complexity.** The agentic loop is more complex to implement and debug than a single prompt. Mitigated by the loop being fully encapsulated in `packages/ai-core`.

## Alternatives considered

**Single prompt with structured JSON output:** Rejected. Cannot trigger real-world side effects mid-turn. Qualification updates and media sends would have to be applied after the full response is returned, losing the ability to reference them in the same response ("I just sent you a brochure...").

**Chain-of-thought with post-processing:** Rejected. Too brittle. Parsing free text to extract actions is error-prone and hard to test.

**Separate classifier + generator:** Rejected. Adds latency and a second model call without meaningful benefit over the native tool-calling API.
