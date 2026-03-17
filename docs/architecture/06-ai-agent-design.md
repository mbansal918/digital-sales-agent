# 06 — AI Agent Design

## Responsibilities

The agent service has one job: given a conversation context and a new customer message, decide what to do next and return a response. It does this by running an agentic tool-calling loop against the Anthropic API.

The agent is **stateless** — it receives everything it needs in the request and returns everything the orchestrator needs in the response. It makes no database calls.

---

## The agent loop

```
Orchestrator calls Agent with:
  - ConversationContext (turns, qualification, materialsShared, ...)
  - New customer message

Agent loop:
  iteration 1:
    → Build messages array from context turns + new message
    → Call Anthropic API (model + tools + system prompt)
    → If stop_reason = "end_turn" → return text response
    → If stop_reason = "tool_use":
        → Execute each tool call (via tool executor)
        → Append tool results to messages
        → Continue loop

  iteration 2, 3... (max 6 iterations):
    → Call Anthropic API with updated messages
    → Repeat until "end_turn"

Return to Orchestrator:
  - Final text response
  - List of tool calls made (for logging)
  - Updated qualification fields (for Orchestrator to persist)
  - handoffRequested flag
```

**Max iterations:** 6. Prevents runaway loops. In practice, most turns complete in 1-2 iterations (one tool call, then a response).

---

## System prompt architecture

The system prompt has three sections, injected fresh on every call:

### 1. Role and behaviour

Fixed text defining who the agent is, its goals, and its rules of engagement. Examples:
- Ask at most one qualification question per turn
- Never fabricate pricing — offer to send the pricing guide instead
- Keep voice responses under 3 sentences
- WhatsApp messages can be longer and formatted with short paragraphs

### 2. Conversation state (dynamic)

Injected from the ConversationContext:
- Active channel (shapes response length and tone)
- Number of prior turns
- Materials already shared (avoids re-sending)
- Appointment status
- Qualification data collected so far

### 3. Qualification strategy

Guides which questions to ask next based on what's already known. Example:
- If `projectType` is unknown → ask about the project
- If `projectType` is known but `budgetRange` is unknown → ask about budget
- If all key fields are set → offer consultation
- If `isDecisionMaker` is false → ask to include the decision maker

---

## Tool execution

Tools are executed by the **Orchestrator**, not the agent service. The agent returns tool call requests; the orchestrator dispatches them to the appropriate handlers and returns results.

This separation means:
- The agent has no knowledge of Twilio, HubSpot, or S3
- Tools can be tested independently of the LLM
- Tool execution (e.g. sending a WhatsApp) can be retried without re-running the LLM

```
Agent → returns tool_use block → Orchestrator dispatches:

  update_qualification    → updates context.qualification in memory
  send_media_to_customer  → calls Twilio WhatsApp API, updates context.materialsShared
  schedule_consultation   → calls Cal.com API or sends booking link via WhatsApp
  handoff_to_human        → publishes handoff.requested event, sets context.handoffRequested
  get_customer_context    → returns recent turns JSON (for agent's own recall)
```

---

## Qualification strategy

The agent collects qualification data incrementally across multiple turns, using the `update_qualification` tool to write each fact as it is revealed. It never asks for all fields at once.

**Priority order for collection:**
1. `projectType` — what kind of work?
2. `propertyType` — residential or commercial?
3. `location` — where is the project?
4. `isDecisionMaker` — are they the decision maker?
5. `timeline` — when do they want to start?
6. `budgetRange` — what is their budget?
7. `urgency` — how urgently do they need this?

The agent always prioritises continuing a natural conversation over mechanically collecting fields. If the customer mentions their budget unprompted, the agent captures it immediately even if it is not next in the priority order.

**Qualification trigger:** When `projectType`, `budgetRange`, and `isDecisionMaker` are all set, the orchestrator emits `lead.qualified`. The agent does not need to know this threshold — it is evaluated by the orchestrator after each turn.

---

## Companion messaging logic

During a voice call, the agent may decide to send materials via WhatsApp to support the conversation. This is a first-class feature, not an afterthought.

The agent uses `send_media_to_customer` with `channel: "whatsapp"` while the active channel is `voice`. The orchestrator's tool handler sends the WhatsApp message immediately, mid-call. The agent then references the sent material in its voice response ("I just sent you a brochure on WhatsApp — take a look while we chat").

The system tracks `materialsShared` to prevent duplicates. If the customer asks for the brochure and it has already been sent, the agent acknowledges this rather than sending it again.

---

## Handoff criteria

The agent should call `handoff_to_human` when:
- The customer explicitly asks to speak with a human
- The customer asks for a detailed, site-specific estimate (requires in-person assessment)
- The project is unusually large or complex (multi-site, commercial at scale)
- The customer expresses frustration or dissatisfaction
- The agent has reached 3 attempts to answer a question and cannot

The agent should **not** hand off simply because the lead is qualified — scheduling a consultation is handled through the `schedule_consultation` tool first.

---

## Safety guardrails

- The agent never quotes specific prices. If asked, it offers to send the pricing guide and schedule a consultation for an accurate estimate.
- The agent never makes promises about timelines or availability — it defers to the human rep.
- The agent does not discuss competitors.
- The agent does not collect payment information.
- If a customer uses abusive language, the agent de-escalates once, then offers a human handoff.
- All agent responses are logged with their tool call trace for auditing.
