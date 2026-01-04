# Caching Quick Reference

> Valkey 9.x + Cache-Aside pattern

## Stack

| Component | Technology                |
| --------- | ------------------------- |
| Cache     | Valkey 9.x                |
| NestJS    | @nestjs/cache-manager 3.x |

## Key Naming

```
{env}:{service}:{entity}:{id}
# dev:auth:permissions:550e8400...
```

## TTL Constants

```typescript
import { CacheTTL } from '@my-girok/nest-common';

CacheTTL.STATIC_CONFIG; // 24h
CacheTTL.SEMI_STATIC; // 15m
CacheTTL.USER_DATA; // 5m
CacheTTL.SESSION; // 30m
CacheTTL.SHORT_LIVED; // 1m
```

## Invalidation

```typescript
// Write-Through
await this.cache.del(`service:entity:${id}`);

// Event-Driven
@OnEvent('permission.updated')
async handle({ roleId }) {
  await this.cache.del(`auth:role_permissions:${roleId}`);
}
```

---

**Full guide**: `docs/policies/CACHING.md`
