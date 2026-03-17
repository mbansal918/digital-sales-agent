# infra/docker/

Local development stack. Starts all infrastructure dependencies so services can be run locally with `npm run dev`.

## Services

| Service | Port | Description |
|---|---|---|
| `postgres` | 5432 | Primary database — schema auto-applied from `init.sql` |
| `redis` | 6379 | Context store hot tier |
| `localstack` | 4566 | Local AWS (SQS FIFO queue + S3 bucket) |

## Usage

```bash
# Start all infrastructure
docker compose up -d

# Start a single service
docker compose up -d postgres redis

# Stop everything
docker compose down

# Wipe volumes (reset all data)
docker compose down -v
```

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Service definitions and networking |
| `Dockerfile.node` | Multi-stage build for all Node.js services |
| `init.sql` | Postgres schema — applied automatically on first start |
| `localstack-init.sh` | Creates SQS FIFO queue and S3 bucket on LocalStack startup |

## LocalStack resources created

- SQS FIFO queue: `sales-agent-events.fifo`
- SQS DLQ: `sales-agent-dlq.fifo` (receives messages after 3 failed attempts)
- S3 bucket: `digital-sales-agent-media`

## Connecting to local services

```bash
# Postgres
psql postgresql://dsa:dsa_dev@localhost:5432/sales_agent

# Redis
redis-cli -u redis://localhost:6379

# LocalStack SQS (list queues)
aws --endpoint-url=http://localhost:4566 sqs list-queues
```
