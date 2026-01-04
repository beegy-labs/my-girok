# Caching Quick Reference

> Valkey 9.x + Cache-Aside pattern

## Stack

| Component   | Technology                    |
| ----------- | ----------------------------- |
| Cache Store | Valkey 9.x (Redis-compatible) |
| NestJS      | @nestjs/cache-manager 3.x     |
| Adapter     | keyv 5.x + @keyv/redis 5.x    |

## Pattern: Cache-Aside

```
Request → Cache.get(key) → HIT → return cached
                        → MISS → DB query → Cache.set(key, data, ttl) → return
```

## Key Naming

```
{env}:{service}:{entity}:{identifier}

Examples:
- dev:auth:permissions:550e8400...
- prod:personal:user_prefs:550e8400...
```

```typescript
import { CacheKey } from '@my-girok/nest-common';

const key = CacheKey.make('auth', 'permissions', roleId);
// → "dev:auth:permissions:550e8400..."
```

## TTL Constants

```typescript
import { CacheTTL } from '@my-girok/nest-common';

CacheTTL.STATIC_CONFIG; // 24h - services, oauth_providers
CacheTTL.SEMI_STATIC; // 15m - permissions, legal_docs
CacheTTL.USER_DATA; // 5m  - user_prefs, resume_meta
CacheTTL.SESSION; // 30m - admin/operator sessions
CacheTTL.SHORT_LIVED; // 1m  - rate_limit, temp_tokens
```

## Service Cache Keys

### auth-service

| Key Pattern                      | TTL |
| -------------------------------- | --- |
| `auth:role_permissions:{roleId}` | 15m |
| `auth:service:{slug}`            | 1h  |
| `auth:service_config:{id}`       | 24h |
| `auth:oauth_provider:{provider}` | 1h  |

### personal-service

| Key Pattern                    | TTL |
| ------------------------------ | --- |
| `personal:user_prefs:{userId}` | 5m  |
| `personal:user_id:{username}`  | 2h  |

### audit-service / analytics-service

| Key Pattern                             | TTL |
| --------------------------------------- | --- |
| `audit:export:{exportId}`               | 24h |
| `analytics:behavior:{serviceId}:{date}` | 5m  |

## Invalidation

```typescript
// Write-Through
await this.cache.del(`service:entity:${id}`);

// Event-Driven (Recommended)
this.eventEmitter.emit('permission.updated', { roleId });

@OnEvent('permission.updated')
async handle({ roleId }) {
  await this.cache.del(`auth:role_permissions:${roleId}`);
}
```

## Environment

```env
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=secret
VALKEY_DB=0
```

---

**Full guide**: `docs/policies/CACHING.md`
