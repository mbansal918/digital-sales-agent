# ADR-002 — SQS FIFO over Kafka for the event bus

**Status:** Accepted
**Date:** 2025-01

---

## Context

Services need to communicate asynchronously. We need an event bus that guarantees per-customer ordering, at-least-once delivery, and dead-letter handling. The two main options are AWS SQS FIFO and Apache Kafka (or AWS MSK).

## Decision

Use **AWS SQS FIFO** for the MVP.

## Reasons

**Per-customer ordering is the only ordering we need.** We do not need total global ordering across all customers. SQS FIFO's `MessageGroupId` gives us exactly what we need: events for the same customer are always processed in order, events for different customers are processed in parallel.

**Operational simplicity.** SQS is fully managed — no brokers to provision, no Zookeeper, no partition rebalancing. For a small team in the early stages, this is a significant operational advantage.

**Dead-letter queue is built in.** After 3 failed processing attempts, SQS automatically moves the message to a DLQ. We get failure isolation for free.

**Cost.** At MVP scale (thousands of messages/day), SQS is effectively free. Kafka (MSK) has a minimum cost of ~$200/month for the smallest cluster.

## Trade-offs accepted

- **No replay of arbitrary historical ranges.** SQS retains messages for up to 14 days but does not support log-like replay from an arbitrary offset. If we need event sourcing replay, we use the `domain_events` Postgres table instead.
- **No fan-out to multiple consumers.** SQS delivers each message to one consumer group. If two services need to consume the same event, we either use SNS+SQS fan-out or have one service re-publish. Currently only one service consumes each event type, so this is not an issue.
- **4 concurrent consumer limit per FIFO queue.** Sufficient for MVP; can be raised by partitioning into multiple queues if needed.

## Migration path to Kafka

If we outgrow SQS (replay requirements, > 5 consumer groups, very high throughput), the `packages/event-bus` abstraction layer means migrating to Kafka requires changing only that package — all services continue to call `publishEvent()` and `on()` without modification.

## Alternatives considered

**Apache Kafka (MSK):** Rejected for MVP. Superior for high-throughput event streaming and replay, but operational overhead and cost are unjustified at this scale.

**Redis Streams:** Rejected. Good for simple cases but lacks native dead-letter handling and the operational tooling around SQS.

**Direct HTTP calls between services:** Rejected. Creates tight coupling and makes it impossible to add new consumers without modifying the emitter.
