# packages/db

PostgreSQL client, repositories, and migration runner. The only code in the system that runs SQL queries directly.

**No service should use `pg` directly.** All database access goes through this package.

## Structure

```
src/
  client.ts              # Pool setup, withTransaction, query, queryOne helpers
  index.ts               # Public exports
  migrations/
    runner.ts            # Reads and applies pending .sql files in order
    001_initial_schema.sql
    002_analytics_views.sql
  repositories/
    customer.repository.ts     # Customer CRUD and lead list queries
    conversation.repository.ts # Conversation upsert, turn insert, turn fetch
```

## Client API

```typescript
getPool()                          → Pool
withTransaction(fn)                → T          // runs fn in a transaction, auto-commits/rolls back
query<T>(sql, params?)             → T[]
queryOne<T>(sql, params?)          → T | null
```

## Repositories

### customer.repository
```typescript
findCustomerById(id)
findCustomerByPhone(phone)
findCustomerByEmail(email)
createCustomer(data)
updateCustomerStatus(id, status)
upsertQualification(customerId, qual)
listLeads({ status?, limit?, offset? })
```

### conversation.repository
```typescript
upsertConversation(context)
insertTurn(conversationId, turn)
getRecentTurns(conversationId, limit?)
getConversationsByCustomer(customerId, limit?)
```

## Running migrations

```bash
# From repo root
npm run migrate --filter=@dsa/db

# Or directly
cd packages/db && npx tsx src/migrations/runner.ts
```

Migrations are run in filename order. Once applied, they are never re-run. The `_migrations` table tracks which files have been applied.

## Adding a migration

1. Create `src/migrations/NNN_description.sql` where `NNN` is the next sequential number
2. Write idempotent SQL (use `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.)
3. Run `npm run migrate` to apply

Never modify an existing migration file after it has been applied to any environment.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
