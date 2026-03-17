# packages/context-store

The only code in the system that reads from or writes to Redis. Provides a clean API for conversation context and customer identity operations.

**No service should import `redis` directly.** All context access goes through this package.

## API

### Conversation context
```typescript
getContext(conversationId)          → ConversationContext | null
saveContext(context)                → void
deleteContext(conversationId)       → void
```

### Identity resolution
```typescript
resolveCustomerId(identifier)       → string | null   // phone/email → customerId
bindIdentity(identifier, customerId) → void
```

### Active conversation pointer
```typescript
getActiveConversation(customerId)   → string | null   // customerId → conversationId
setActiveConversation(customerId, conversationId) → void
```

### Customer cache (short-lived, backed by Postgres)
```typescript
getCachedCustomer(customerId)       → Customer | null
cacheCustomer(customer)             → void             // 5 min TTL
invalidateCustomer(customerId)      → void
```

## Redis key schema

| Key pattern | Value | TTL |
|---|---|---|
| `ctx:{conversationId}` | Serialized ConversationContext | 24 hours |
| `identity:{identifier}` | customerId string | No expiry |
| `active:{customerId}` | conversationId string | 24 hours |
| `customer:{customerId}` | Serialized Customer | 5 minutes |

## Environment variables

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis connection string e.g. `redis://localhost:6379` |
