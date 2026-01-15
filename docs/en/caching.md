# Caching

> Valkey 9.x with Cache-Aside pattern for distributed caching

## Stack Overview

| Component | Tech                      |
| --------- | ------------------------- |
| Cache     | Valkey 9.x                |
| NestJS    | @nestjs/cache-manager 3.x |

The project uses Valkey (Redis-compatible) as the caching layer with the Cache-Aside pattern, where the application manages cache population and invalidation.

## Key Naming Convention

All cache keys follow a hierarchical naming pattern for organization and easier debugging:

```
{env}:{service}:{entity}:{id}
# dev:auth:permissions:550e8400...
```

This format enables:

- Environment isolation (dev, staging, prod)
- Service-level namespacing
- Entity-type categorization
- Unique identification

## TTL Constants

The `@my-girok/nest-common` package provides standardized TTL values:

```typescript
import { CacheTTL } from '@my-girok/nest-common';

CacheTTL.STATIC_CONFIG; // 24h
CacheTTL.SEMI_STATIC; // 15m
CacheTTL.USER_DATA; // 5m
CacheTTL.SESSION; // 30m
CacheTTL.SHORT_LIVED; // 1m
CacheTTL.EPHEMERAL; // 10s
```

**Usage Guidelines**:

- `STATIC_CONFIG`: Configuration that rarely changes (feature flags, system settings)
- `SEMI_STATIC`: Data that changes occasionally (user preferences, permissions)
- `USER_DATA`: Frequently accessed user-specific data
- `SESSION`: Session-related data
- `SHORT_LIVED`: Rapidly changing data requiring frequent refresh
- `EPHEMERAL`: Very short-lived data like rate limiting counters

## Cache Invalidation

### Write-Through Invalidation

Delete cache entries immediately when data changes:

```typescript
// Write-Through
await this.cache.del(`service:entity:${id}`);
```

### Event-Driven Invalidation

Use event handlers for cascading invalidation across services:

```typescript
// Event-Driven
@OnEvent('permission.updated')
async handle({ roleId }) {
  await this.cache.del(`auth:role_permissions:${roleId}`);
}
```

## Best Practices

- Always define TTLs appropriate to data volatility
- Use event-driven invalidation for cross-service cache coherence
- Implement graceful degradation when cache is unavailable
- Monitor cache hit rates and adjust TTLs accordingly

---

**Full guide**: `docs/llm/policies/caching.md`
