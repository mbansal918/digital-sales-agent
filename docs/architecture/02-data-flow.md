# 02 — Data Flow

This document traces the exact path a message takes through the system, for each major scenario.

---

## Scenario A: Outbound call — first contact

```
1.  Workflow Engine        triggers outbound call (lead from CRM import)
2.  channel-adapters       calls Twilio REST API → initiates call to customer
3.  Twilio                 connects call, requests TwiML from gateway
4.  Gateway                returns TwiML: Say greeting + Gather speech
5.  Customer               speaks ("I need help with a renovation")
6.  Twilio                 POSTs SpeechResult to Gateway /voice/reply
7.  Gateway                normalizes → ChannelMessage, publishes channel.message.received
8.  Orchestrator           consumes event
                           → resolves phone → customerId (new: creates customer)
                           → creates ConversationContext, saves to Redis
                           → calls Agent with context + customer speech
9.  Agent                  runs LLM loop
                           → calls update_qualification tool (projectType: residential_renovation)
                           → returns: "That sounds like a great project! Are you the homeowner?"
10. Orchestrator           appends turns to context, saves to Redis
                           → publishes channel.message.sent
11. Gateway                receives channel.message.sent
                           → responds to Twilio with new TwiML (Say agent reply + Gather)
12. Twilio                 speaks agent reply to customer
```

---

## Scenario B: Companion messaging during a call

```
1.  Customer (on call)     "Can you send me some examples of your work?"
2.  Twilio                 POSTs SpeechResult → Gateway
3.  Gateway                publishes channel.message.received
4.  Orchestrator           calls Agent
5.  Agent                  calls send_media_to_customer tool
                           { mediaType: "project_photos", channel: "whatsapp" }
6.  Orchestrator           tool handler:
                           → looks up customer WhatsApp number
                           → calls Twilio WhatsApp API → sends photo message
                           → appends "project_photos" to context.materialsShared
7.  Agent                  returns voice reply: "I just sent some photos to your WhatsApp — take a look!"
8.  Orchestrator           saves context, publishes channel.message.sent
9.  Gateway                returns TwiML with agent voice reply
10. Customer               receives WhatsApp message while still on the call
```

---

## Scenario C: Customer calls back (returning customer)

```
1.  Customer               calls the number back
2.  Twilio                 POSTs to Gateway /voice/inbound
3.  Gateway                publishes call.started with From = +12065551234
4.  Orchestrator           consumes event
                           → resolveCustomerId("+12065551234") → "cust-abc" (found in Redis)
                           → getActiveConversation("cust-abc") → "conv-xyz" (found)
                           → loadContext("conv-xyz") → full prior context loaded from Redis
5.  Agent                  receives full prior context (prior turns, qualification data, materials shared)
                           → recognizes returning customer
                           → returns: "Welcome back! Last time we talked about your kitchen renovation in Seattle.
                                       Have you had a chance to look at the project photos I sent?"
6.  Orchestrator           continues conversation with existing context
```

---

## Scenario D: Call ends without booking — follow-up triggered

```
1.  Twilio                 POSTs call status callback: CallStatus=completed
2.  Gateway                publishes call.ended { callSid, duration }
3.  Orchestrator           consumes call.ended
                           → loads context for callSid
                           → checks: appointmentScheduled=false, handoffRequested=false
                           → publishes follow_up.scheduled
                             { trigger: "call_ended_no_booking", templateId: "follow-up-no-booking" }
4.  Workflow Engine         consumes follow_up.scheduled
                           → creates FollowUpTask scheduled for T+60min
5.  [60 minutes later]
    Workflow Engine         processor fires
                           → sends WhatsApp: "Hi! We spoke earlier about your project..."
                           → marks task as sent
                           → publishes follow_up.sent
```

---

## Scenario E: Lead qualifies — CRM sync

```
1.  Orchestrator           after Agent turn, checks qualification completeness:
                           projectType ✓  budgetRange ✓  isDecisionMaker ✓
                           → publishes lead.qualified { qualification }
2.  CRM Service            consumes lead.qualified
                           → upserts HubSpot contact
                           → creates HubSpot deal with qualification data
                           → publishes lead.status_changed { toStatus: "qualified" }
3.  Workflow Engine         consumes lead.status_changed
                           → schedules "no_response_48h" follow-up task
4.  Admin UI               next poll shows lead as "qualified" in pipeline
```

---

## Scenario F: Human handoff

```
1.  Agent                  detects: customer asks for a detailed quote, complex multi-site project
                           → calls handoff_to_human tool { reason: "...", urgency: "high" }
2.  Orchestrator           tool handler publishes handoff.requested
3.  CRM Service            consumes handoff.requested
                           → creates high-priority HubSpot task for sales rep
                           → sends Slack notification to sales channel (future)
4.  Orchestrator           agent returns to customer:
                           "I'm connecting you with one of our senior consultants now.
                            They'll have a full summary of our conversation."
5.  Human rep              opens HubSpot task → sees full qualification data + conversation summary
```

---

## Event flow summary

```
channel.message.received  →  Orchestrator
call.started              →  Orchestrator
call.ended                →  Orchestrator
channel.message.sent      →  Gateway (delivers response)
lead.qualified            →  CRM Service, Workflow Engine
lead.status_changed       →  Workflow Engine
handoff.requested         →  CRM Service
follow_up.scheduled       →  Workflow Engine
follow_up.sent            →  (logging only)
appointment.scheduled     →  CRM Service, Workflow Engine
```

All events are FIFO per-customer. A customer's events are always processed in the order they occurred.
