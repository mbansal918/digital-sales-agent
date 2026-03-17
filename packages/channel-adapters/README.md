# packages/channel-adapters

Normalizes raw inbound webhook payloads from each channel into the system's unified `ChannelMessage` format, and provides helpers for sending outbound messages.

**No service should import `twilio` directly.** All channel I/O goes through this package.

## Inbound normalizers

Each normalizer takes the raw webhook body from its provider and returns a partial `ChannelMessage`:

```typescript
normalizeVoiceWebhook(body)      → Partial<ChannelMessage>
normalizeWhatsAppWebhook(body)   → Partial<ChannelMessage>
```

The `customerId` field in the returned object is the raw phone number — the orchestrator resolves this to a stable UUID.

## Outbound senders

```typescript
sendWhatsApp(to, message, mediaUrl?)  → messageSid
sendSms(to, message)                  → messageSid
initiateOutboundCall(to, webhookUrl)  → callSid
```

## TwiML builders

```typescript
buildSpeakAndListenTwiml(agentText, webhookUrl)  → TwiML string
buildHangupTwiml(farewellText)                   → TwiML string
```

## Media assets

```typescript
MEDIA_ASSETS  // Record<string, S3 URL> for brochures, photos, etc.
getMediaUrl(mediaType)  → string | undefined
```

Media asset URLs are read from environment variables so they can be changed without a code deploy.

## Adding a new channel

1. Create `src/adapters/{channel}.ts` with an inbound normalizer
2. Add outbound send function(s) if needed
3. Export from `src/index.ts`
4. Add a route in `apps/gateway`
5. Update `Channel` type in `packages/shared-types`

## Environment variables

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | |
| `TWILIO_AUTH_TOKEN` | |
| `TWILIO_PHONE_NUMBER` | Voice number |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp-enabled number |
| `S3_MEDIA_BUCKET` | Bucket containing brochures, photos, etc. |
