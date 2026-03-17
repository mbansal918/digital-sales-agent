# packages/event-bus

AWS SQS FIFO publisher and consumer SDK. The only code in the system that talks to SQS directly.

**No service should import `@aws-sdk/client-sqs` directly.** All event bus operations go through this package.

## API

### Publishing
```typescript
publishEvent(type, payload, meta) → DomainEvent<T>

// Example
await publishEvent('lead.qualified', { qualification }, {
  customerId: 'cust-uuid',
  conversationId: 'conv-uuid',
  source: 'orchestrator',
});
```

### Subscribing
```typescript
on(eventType, handler) → void

on('channel.message.received', async (event) => {
  // handle event
});
```

### Starting the consumer
```typescript
startConsuming({ maxMessages?, waitSeconds? }) → void  // runs forever
```

## FIFO ordering

All events for the same customer are ordered. `MessageGroupId` is set to `customerId`. This guarantees that if a customer sends two messages in quick succession, they are processed in order and not interleaved.

## Dead-letter queue

After 3 failed processing attempts (unhandled exception or timeout), SQS moves the message to the DLQ. Monitor DLQ depth — any message in the DLQ represents a conversation turn that was not processed. The DLQ message contains the full original event for debugging and manual replay.

## Local development

In local dev, the consumer points to a LocalStack SQS instance. See `infra/docker/` for setup. The queue URL is set via `SQS_QUEUE_URL` and the AWS endpoint is overridden via `AWS_ENDPOINT_URL=http://localhost:4566`.

## Environment variables

| Variable | Description |
|---|---|
| `SQS_QUEUE_URL` | Full SQS queue URL |
| `AWS_REGION` | Defaults to `us-east-1` |
| `AWS_ENDPOINT_URL` | Override for LocalStack in local dev |
