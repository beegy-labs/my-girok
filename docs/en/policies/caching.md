# Caching Policy

> Valkey-based caching strategy with Cache-Aside pattern

## Overview

This document defines the caching strategy for the my-girok platform. We use **Valkey** (a Redis-compatible in-memory data store) with the **Cache-Aside** pattern to reduce database load and improve response times.

## Technology Stack

| Component          | Technology            | Version |
| ------------------ | --------------------- | ------- |
| Cache Store        | Valkey                | 9.x     |
| NestJS Integration | @nestjs/cache-manager | 3.x     |
| Cache Manager      | cache-manager         | 7.x     |
| Key-Value Store    | keyv                  | 5.x     |
| Redis Adapter      | @keyv/redis           | 5.x     |

## Why Valkey?

Valkey is a community-driven fork of Redis that offers significant improvements:

| Benefit             | Value                                  |
| ------------------- | -------------------------------------- |
| Memory Efficiency   | 40% reduction vs Redis OSS             |
| Scaling Performance | 230% improvement in cluster mode       |
| Cost Savings        | 33% reduced pricing on AWS ElastiCache |
| Compatibility       | Full Redis protocol compatible         |

## Cache-Aside Pattern

The Cache-Aside pattern (also known as "Lazy Loading") is our primary caching strategy:

```
Request -> Cache HIT? -> Return cached data
              |
           MISS? -> Query DB -> Store in cache -> Return data
```

### Benefits

1. **Simple to implement**: No complex synchronization logic
2. **Resilient**: Application works even if cache fails (falls back to DB)
3. **Lazy loading**: Only caches data that is actually requested
4. **Memory efficient**: Unused data naturally expires via TTL

### Trade-offs

1. **First request latency**: Cache miss incurs DB query + cache write
2. **Potential staleness**: Data may be stale until TTL expires
3. **Thundering herd**: Mitigate with locking for concurrent misses

## Configuration

```typescript
import { CacheModule } from '@nestjs/cache-manager';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const host = configService.get('VALKEY_HOST', 'localhost');
        const port = configService.get('VALKEY_PORT', 6379);
        const password = configService.get('VALKEY_PASSWORD');
        const db = configService.get('VALKEY_DB', 0);

        const authPart = password ? `:${password}@` : '';
        const redisUrl = `redis://${authPart}${host}:${port}/${db}`;

        return {
          stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
          ttl: 300000, // 5 minutes default (in milliseconds!)
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Cache Key Format

All cache keys follow a standardized format:

```
{env}:{service}:{entity}:{id}
```

### Environment Prefixes

| Environment | Prefix  |
| ----------- | ------- |
| Development | dev     |
| Staging     | release |
| Production  | prod    |

### CacheKey Helper

```typescript
import { CacheKey } from '@my-girok/nest-common';

// Generate cache key
CacheKey.make('auth', 'permissions', roleId);
// Output: "dev:auth:permissions:uuid"

// Generate pattern for scanning
CacheKey.pattern('auth', 'permissions', '*');
// Output: "dev:auth:permissions:*"
```

## TTL Policy

Use the standardized TTL constants from `@my-girok/nest-common`:

| Constant        | TTL   | Milliseconds | Use Cases                     |
| --------------- | ----- | ------------ | ----------------------------- |
| STATIC_CONFIG   | 24h   | 86400000     | Services, OAuth configs, laws |
| SEMI_STATIC     | 15min | 900000       | Permissions, legal documents  |
| USER_DATA       | 5min  | 300000       | Preferences, resume metadata  |
| SESSION         | 30min | 1800000      | Admin/operator sessions       |
| SHORT_LIVED     | 1min  | 60000        | Rate limiting, temp tokens    |
| EPHEMERAL       | 10s   | 10000        | Real-time metrics             |
| USERNAME_LOOKUP | 2h    | 7200000      | Username → userId mapping     |
| EXPORT_STATUS   | 24h   | 86400000     | Export job tracking           |
| ANALYTICS       | 5min  | 300000       | Behavior summary              |
| FUNNEL          | 15min | 900000       | Funnel data                   |

## Service-Specific Caching

### auth-service

| Data             | Key Pattern                     | TTL   | Invalidation Event       |
| ---------------- | ------------------------------- | ----- | ------------------------ |
| Role Permissions | auth:role_permissions:{id}      | 15min | role.permissions.updated |
| Service          | auth:service:{slug}             | 1h    | service.updated          |
| Legal Docs       | auth:legal_docs:{locale}:{type} | 30min | legal_document.published |

### personal-service

| Data             | Key Pattern               | TTL  | Invalidation Event       |
| ---------------- | ------------------------- | ---- | ------------------------ |
| User Preferences | personal:user_prefs:{id}  | 5min | user_preferences.updated |
| Resume Metadata  | personal:resume_meta:{id} | 5min | resume.updated           |

## Cache Invalidation Strategies

### 1. TTL-Based (Passive)

```typescript
await this.cache.set(key, data, 900000); // Expires after 15 minutes
```

### 2. Write-Through (Active)

```typescript
// Update DB and invalidate cache
await this.prisma.service.update({ where: { slug }, data });
await this.cache.del(`auth:service:${slug}`);
```

### 3. Pattern-Based Deletion

```typescript
const redis = (this.cache as any).store.getClient();
const keys = await redis.keys(`auth:role_permissions:${roleId}:*`);
if (keys.length) await redis.del(...keys);
```

### 4. Event-Driven

```typescript
// Emit event on data change
this.eventEmitter.emit('role.permissions.updated', { roleId });

// Listen and invalidate
@OnEvent('role.permissions.updated')
async handleRolePermissionsUpdated({ roleId }: { roleId: string }) {
  await this.cache.del(`auth:role_permissions:${roleId}`);
}
```

## Cache Wrapper Utility

```typescript
async getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300000
): Promise<T> {
  const cached = await this.cache.get<T>(key);
  if (cached !== undefined) return cached;

  const data = await fetcher();
  await this.cache.set(key, data, ttl);
  return data;
}
```

## Anti-Patterns to Avoid

| Problem                  | Solution                                      |
| ------------------------ | --------------------------------------------- |
| Caching everything       | Only cache hot paths with high read frequency |
| No TTL set               | Always set appropriate TTL                    |
| Caching mutable entities | Cache derived/read-only data                  |
| Key collisions           | Use namespaced keys with env prefix           |
| N+1 cache calls          | Batch operations with mget/mset               |

## Monitoring & Metrics

| Metric         | Target | Alert Threshold |
| -------------- | ------ | --------------- |
| Cache Hit Rate | >80%   | <60%            |
| GET Latency    | <1ms   | >5ms            |
| Memory Usage   | <70%   | >85%            |

## Environment Variables

```bash
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=secret
VALKEY_DB=0
CACHE_DEFAULT_TTL=300000
CACHE_ENABLED=true
```

---

**LLM Reference**: `docs/llm/policies/CACHING.md`
