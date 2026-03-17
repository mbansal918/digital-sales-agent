# apps/gateway

**Role:** The front door of the system. Receives raw inbound webhooks from Twilio (voice and WhatsApp), validates them, normalizes the payloads into `ChannelMessage` events, and publishes them to the event bus. For voice calls, it also returns synchronous TwiML responses to Twilio.

## Why this service exists separately

Twilio requires a synchronous HTTP response (TwiML) within 15 seconds for voice calls. The gateway handles this constraint by returning a holding response immediately, while the orchestrator processes the message asynchronously. Without this decoupling, a slow LLM call would cause the call to drop.

## Responsibilities

- Validate Twilio webhook HMAC signatures
- Normalize voice and WhatsApp payloads via `@dsa/channel-adapters`
- Publish `channel.message.received`, `call.started`, `call.ended` events
- Consume `channel.message.sent` events to deliver TwiML responses back to Twilio
- Expose `/health` for load balancer checks

## Routes

| Method | Path | Description |
|---|---|---|
| POST | `/voice/inbound` | Twilio calls this when a call is received |
| POST | `/voice/reply` | Twilio calls this when customer speaks (SpeechResult) |
| POST | `/voice/status` | Twilio call status callbacks |
| POST | `/whatsapp/inbound` | Twilio calls this for incoming WhatsApp messages |
| GET | `/health` | Load balancer health check |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Yes | Used to validate webhook signatures |
| `TWILIO_PHONE_NUMBER` | Yes | Outbound voice number |
| `TWILIO_WHATSAPP_NUMBER` | Yes | WhatsApp-enabled number |
| `SQS_QUEUE_URL` | Yes | Event bus queue |
| `GATEWAY_PORT` | No | Defaults to 3000 |
| `GATEWAY_BASE_URL` | Yes | Public URL of this service (used in TwiML action URLs) |

## Key dependencies

- `@dsa/channel-adapters` — webhook normalization and TwiML generation
- `@dsa/event-bus` — publishing and consuming events
