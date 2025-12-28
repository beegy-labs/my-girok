# Caching Strategy

> LLM-optimized: Token-efficient patterns and rules

## Stack

- **Valkey 9.x** (Redis-compatible, 40% less memory)
- **@nestjs/cache-manager 3.x** + **cache-manager 7.x** + **keyv 5.x** + **@keyv/redis 5.x**
- **TTL in milliseconds** (cache-manager v5+ breaking change)

## Pattern: Cache-Aside (Lazy Loading)

```
Request → Cache.get(key) → HIT → return cached
                        → MISS → DB query → Cache.set(key, data, ttl) → return
```

## Key Naming Convention

```
{env}:{service}:{entity}:{identifier}

Format: Environment prefix allows shared Valkey DB across environments.

Environments:
- dev    → Development
- release → Staging/Release
- prod   → Production

Examples:
- dev:auth:permissions:550e8400-e29b-41d4-a716-446655440000
- release:auth:service:homeshopping
- prod:personal:user_prefs:550e8400-e29b-41d4-a716-446655440000
```

## Environment Prefix Helper

```typescript
// packages/nest-common/src/cache/cache-key.helper.ts
export class CacheKey {
  private static env = process.env.NODE_ENV || 'dev';

  static make(...parts: string[]): string {
    return [this.env, ...parts].join(':');
  }
}

// Usage:
CacheKey.make('auth', 'permissions', roleId);
// → "dev:auth:permissions:550e8400..."
```

## CacheTTL Constants

Standardized TTL values from `@my-girok/nest-common`:

```typescript
import { CacheTTL } from '@my-girok/nest-common';

await this.cache.set(key, data, CacheTTL.STATIC_CONFIG); // 24h
await this.cache.set(key, data, CacheTTL.SEMI_STATIC); // 15m
await this.cache.set(key, data, CacheTTL.USER_DATA); // 5m
await this.cache.set(key, data, CacheTTL.SESSION); // 30m
await this.cache.set(key, data, CacheTTL.SHORT_LIVED); // 1m
```

| Constant          | Duration | Use Cases                              |
| ----------------- | -------- | -------------------------------------- |
| `STATIC_CONFIG`   | 24h      | services, oauth_providers, permissions |
| `SEMI_STATIC`     | 15m      | legal_documents, funnel data           |
| `USER_DATA`       | 5m       | user_prefs, resume_meta, analytics     |
| `SESSION`         | 30m      | admin/operator sessions                |
| `SHORT_LIVED`     | 1m       | rate_limit, temp_tokens                |
| `EPHEMERAL`       | 10s      | real-time metrics                      |
| `USERNAME_LOOKUP` | 2h       | username to userId mapping             |
| `EXPORT_STATUS`   | 24h      | export job status                      |

## TTL Policy

| Category          | TTL             | Examples                                |
| ----------------- | --------------- | --------------------------------------- |
| **Static Config** | 1h (3600000ms)  | services, oauth_providers, law_registry |
| **Semi-Static**   | 15m (900000ms)  | role_permissions, legal_documents       |
| **User Data**     | 5m (300000ms)   | user_prefs, resume_meta                 |
| **Session**       | 30m (1800000ms) | admin_session, operator_session         |
| **Short-lived**   | 1m (60000ms)    | rate_limit, temp_tokens                 |

## Cache Invalidation

### Write-Through Pattern

```typescript
async update(id: string, data: UpdateDto) {
  const result = await this.prisma.entity.update({ where: { id }, data });
  await this.cache.del(`service:entity:${id}`);  // Invalidate immediately
  return result;
}
```

### Pattern-Based Invalidation

```typescript
// When role permissions change, invalidate all users with that role
await this.invalidatePattern(`auth:role_permissions:*`);
```

### Event-Driven Invalidation (Recommended)

```typescript
// Emit event after update
this.eventEmitter.emit('permission.updated', { roleId });

// Listener invalidates cache
@OnEvent('permission.updated')
async handlePermissionUpdate({ roleId }) {
  await this.cache.del(`auth:role_permissions:${roleId}`);
}
```

## Service-Specific Cache Keys

### auth-service

| Key Pattern                       | TTL | Invalidation Trigger                  |
| --------------------------------- | --- | ------------------------------------- |
| `auth:role_permissions:{roleId}`  | 15m | role_permissions INSERT/UPDATE/DELETE |
| `auth:service:{slug}`             | 1h  | services UPDATE                       |
| `auth:legal_docs:{locale}:{type}` | 30m | legal_documents publish               |
| `auth:oauth_provider:{provider}`  | 1h  | oauth_config UPDATE                   |
| `auth:admin_perms:{adminId}`      | 15m | admin role change                     |

### personal-service

| Key Pattern                       | TTL | Invalidation Trigger                  |
| --------------------------------- | --- | ------------------------------------- |
| `personal:user_prefs:{userId}`    | 5m  | user_preferences UPDATE               |
| `personal:resume_meta:{resumeId}` | 5m  | resume UPDATE (title, isDefault only) |
| `personal:user_id:{username}`     | 1h  | user DELETE (rare)                    |

### audit-service

| Key Pattern                         | TTL | Invalidation Trigger |
| ----------------------------------- | --- | -------------------- |
| `audit:export:{exportId}`           | 24h | export complete      |
| `audit:retention_policy:{policyId}` | 1h  | policy UPDATE        |

### analytics-service

| Key Pattern                             | TTL | Invalidation Trigger |
| --------------------------------------- | --- | -------------------- |
| `analytics:behavior:{serviceId}:{date}` | 5m  | Refreshable MV       |
| `analytics:funnel:{funnelId}:{date}`    | 15m | Refreshable MV       |
| `analytics:session:{serviceId}:{date}`  | 5m  | Refreshable MV       |

## Implementation Snippets

### Module Setup

```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';

CacheModule.registerAsync({
  isGlobal: true,
  useFactory: async (config: ConfigService) => {
    const host = config.get('VALKEY_HOST');
    const port = config.get('VALKEY_PORT', 6379);
    const password = config.get('VALKEY_PASSWORD');
    const db = config.get('VALKEY_DB', 0);
    const authPart = password ? `:${password}@` : '';
    const redisUrl = `redis://${authPart}${host}:${port}/${db}`;

    return {
      stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
      ttl: 300000, // 5m default
    };
  },
  inject: [ConfigService],
});
```

### Cache-Aside Service Pattern

```typescript
@Injectable()
export class CachedService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined) return cached;

    const data = await fetcher();
    await this.cache.set(key, data, ttl);
    return data;
  }
}
```

### Usage Example

```typescript
async getPermissions(roleId: string): Promise<string[]> {
  return this.cachedService.get(
    `auth:role_permissions:${roleId}`,
    () => this.fetchPermissionsFromDb(roleId),
    900000, // 15m
  );
}
```

## Anti-Patterns

| Anti-Pattern              | Problem                  | Solution                           |
| ------------------------- | ------------------------ | ---------------------------------- |
| Cache everything          | Memory bloat, stale data | Cache only hot paths               |
| No TTL                    | Memory leak              | Always set TTL                     |
| Cache mutable entities    | Consistency issues       | Cache immutable/slow-changing only |
| Bypass cache in loops     | N+1 cache calls          | Batch fetch first                  |
| String concatenation keys | Collision risk           | Use structured key format          |

## Monitoring

```typescript
// Log cache hit/miss ratio
this.logger.debug(`Cache ${cached ? 'HIT' : 'MISS'}: ${key}`);
```

**Metrics to track:**

- Cache hit rate (target: >80%)
- Valkey memory usage
- Key count by prefix
- Eviction rate

## ClickHouse Materialized Views

Pre-aggregated analytics data for dashboard queries.

### Available MVs

| MV Name                                       | Target Table           | Engine           | TTL | Purpose                     |
| --------------------------------------------- | ---------------------- | ---------------- | --- | --------------------------- |
| `daily_session_stats_mv`                      | daily_session_stats    | SummingMergeTree | 1y  | Daily session metrics       |
| `hourly_event_counts_mv`                      | hourly_event_counts    | SummingMergeTree | 90d | Event frequency trends      |
| `page_performance_mv`                         | page_performance_stats | SummingMergeTree | 90d | Page load & Core Web Vitals |
| `funnel_stats_mv`                             | funnel_stats           | SummingMergeTree | 90d | Funnel conversion rates     |
| `hourly_session_metrics_mv`                   | hourly_session_metrics | SummingMergeTree | 30d | Hourly session trends       |
| `session_dist_{device,browser,os,country}_mv` | session_distributions  | SummingMergeTree | 90d | Session breakdowns          |
| `utm_campaign_stats_mv`                       | utm_campaign_stats     | SummingMergeTree | 90d | Campaign attribution        |

### Query Optimization

```sql
-- Instead of scanning raw sessions table:
SELECT date, session_count, bounce_count FROM session_distributions
WHERE dimension_type = 'device' AND date >= today() - 7;

-- UTM campaign performance:
SELECT utm_source, utm_medium, session_count, conversion_count
FROM utm_campaign_stats WHERE date = today();
```

### Schema Location

`infrastructure/clickhouse/schemas/03-materialized_views.sql`

## Environment Variables

```env
VALKEY_HOST=valkey.internal
VALKEY_PORT=6379
VALKEY_PASSWORD=secret
VALKEY_DB=0
CACHE_DEFAULT_TTL=300000
```
