# Caching Policy

## Overview

This document defines the caching strategy for the my-girok platform. We use **Valkey** (a Redis-compatible in-memory data store) with the **Cache-Aside** pattern to reduce database load and improve response times.

## Why Valkey?

Valkey is a community-driven fork of Redis that offers:

- **40% memory reduction** compared to Redis OSS
- **230% scaling improvements** in cluster mode
- **33% reduced pricing** on AWS ElastiCache
- Full Redis protocol compatibility

For more information, see the [AWS re:Invent 2025 ElastiCache recap](https://aws.amazon.com/blogs/database/amazon-elasticache-reinvent-2025-recap/).

---

## Cache-Aside Pattern

The Cache-Aside pattern (also known as "Lazy Loading") is our primary caching strategy. This pattern works as follows:

```
┌─────────┐       ┌─────────┐       ┌─────────┐
│ Request │──────▶│  Cache  │──────▶│   DB    │
└─────────┘       └─────────┘       └─────────┘
                       │
                  HIT? │ MISS?
                  ┌────┴────┐
                  ▼         ▼
              Return    Query DB
              cached    Store result
              data      Return data
```

### Benefits

1. **Simple to implement**: No complex synchronization logic
2. **Resilient**: Application works even if cache fails (falls back to DB)
3. **Lazy**: Only caches data that is actually requested
4. **Memory efficient**: Unused data naturally expires via TTL

### Trade-offs

1. **First request latency**: Cache miss incurs DB query + cache write
2. **Potential staleness**: Data may be stale until TTL expires or invalidation occurs
3. **Thundering herd**: Multiple concurrent cache misses can overload DB (mitigate with locking)

---

## Technology Stack

| Component          | Technology            | Version |
| ------------------ | --------------------- | ------- |
| Cache Store        | Valkey                | 9.x     |
| NestJS Integration | @nestjs/cache-manager | 3.x     |
| Cache Manager      | cache-manager         | 7.x     |
| Key-Value Store    | keyv                  | 5.x     |
| Redis Adapter      | @keyv/redis           | 5.x     |

### Installation

```bash
pnpm add @nestjs/cache-manager cache-manager keyv @keyv/redis
```

### Configuration

```typescript
// In your app.module.ts or a dedicated cache.module.ts
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

        // Build Redis URL: redis://[:password@]host[:port][/db]
        const authPart = password ? `:${password}@` : '';
        const redisUrl = `redis://${authPart}${host}:${port}/${db}`;

        return {
          stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
          ttl: 300000, // 5 minutes default (in milliseconds)
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

> **Important**: cache-manager v5+ uses milliseconds for TTL, not seconds!

---

## Key Naming Convention

We use a hierarchical key naming convention to organize cache entries and enable pattern-based invalidation.

### Format

```
{env}:{service}:{entity}:{identifier}
```

**Environment Prefix**: All services share the same Valkey instance. The environment prefix prevents cache collisions between dev/release/prod environments.

| Environment     | Prefix    | Description            |
| --------------- | --------- | ---------------------- |
| Development     | `dev`     | Local and dev cluster  |
| Release/Staging | `release` | Pre-production testing |
| Production      | `prod`    | Live environment       |

### Examples

| Key                                      | Description              |
| ---------------------------------------- | ------------------------ |
| `dev:auth:permissions:550e8400...`       | Role permissions (dev)   |
| `release:auth:service:homeshopping`      | Service config (staging) |
| `prod:auth:legal_docs:ko:PRIVACY_POLICY` | Legal document (prod)    |
| `prod:personal:user_prefs:550e8400...`   | User preferences (prod)  |
| `prod:audit:export:550e8400...`          | Export job status (prod) |

### CacheKey Helper

Use the `CacheKey` helper from `@my-girok/nest-common` to construct keys with automatic environment prefix:

```typescript
import { CacheKey } from '@my-girok/nest-common';

// Automatically prefixes with NODE_ENV (dev/release/prod)
const key = CacheKey.make('auth', 'permissions', roleId);
// → "dev:auth:permissions:550e8400-e29b-41d4-a716-446655440000"

// Invalidate by pattern
const pattern = CacheKey.pattern('auth', 'permissions', '*');
// → "dev:auth:permissions:*"
```

### Rules

1. **Always use colons (`:`) as separators** - enables pattern matching with `KEYS` command
2. **Environment prefix first** - isolates environments sharing the same Valkey instance
3. **Service prefix second** - isolates keys by service boundary
4. **Entity type third** - groups related data
5. **Identifier last** - typically a UUID or slug

---

## TTL (Time-To-Live) Policy

Different types of data require different cache durations based on their change frequency and consistency requirements.

### TTL Categories

| Category                 | TTL        | Milliseconds | Use Cases                               |
| ------------------------ | ---------- | ------------ | --------------------------------------- |
| **Static Configuration** | 1 hour     | 3,600,000    | Services, OAuth providers, law registry |
| **Semi-Static**          | 15 minutes | 900,000      | Role permissions, legal documents       |
| **User Data**            | 5 minutes  | 300,000      | User preferences, resume metadata       |
| **Session Data**         | 30 minutes | 1,800,000    | Admin sessions, operator sessions       |
| **Short-lived**          | 1 minute   | 60,000       | Rate limiting, temporary tokens         |
| **Ephemeral**            | 10 seconds | 10,000       | Real-time metrics, active user count    |

### Guidelines

1. **Start conservative**: Begin with shorter TTLs and increase based on observed patterns
2. **Consider consistency**: Data that must be fresh should have shorter TTLs
3. **Balance memory vs latency**: Longer TTLs save DB calls but use more memory
4. **Document your choices**: Add comments explaining why a specific TTL was chosen

---

## Cache Invalidation Strategies

Cache invalidation is one of the hardest problems in computer science. We use several strategies depending on the use case.

### 1. TTL-Based Expiration (Default)

The simplest approach - data automatically expires after the TTL period.

```typescript
await this.cache.set(key, data, 900000); // Expires in 15 minutes
```

**When to use**: Data that can tolerate some staleness

### 2. Write-Through Invalidation

Invalidate the cache immediately when data is modified.

```typescript
async updateService(slug: string, data: UpdateServiceDto) {
  // Update database
  const result = await this.prisma.service.update({
    where: { slug },
    data,
  });

  // Invalidate cache
  await this.cache.del(`auth:service:${slug}`);

  return result;
}
```

**When to use**: Data that must be consistent immediately after updates

### 3. Pattern-Based Invalidation

Invalidate multiple related keys using pattern matching.

```typescript
async invalidateRolePermissions(roleId: string) {
  // Get all keys matching the pattern
  const redis = (this.cache as any).store.getClient();
  const keys = await redis.keys(`auth:role_permissions:${roleId}:*`);

  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

**When to use**: When a single update affects multiple cache entries

### 4. Event-Driven Invalidation (Recommended)

Use events to decouple cache invalidation from business logic.

```typescript
// In the service that modifies data
@Injectable()
export class RoleService {
  constructor(private eventEmitter: EventEmitter2) {}

  async updateRolePermissions(roleId: string, permissions: string[]) {
    await this.prisma.rolePermission.updateMany({ ... });

    // Emit event
    this.eventEmitter.emit('role.permissions.updated', { roleId });
  }
}

// In a dedicated cache invalidation listener
@Injectable()
export class CacheInvalidationListener {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  @OnEvent('role.permissions.updated')
  async handleRolePermissionsUpdate({ roleId }: { roleId: string }) {
    await this.cache.del(`auth:role_permissions:${roleId}`);
    this.logger.log(`Invalidated cache for role ${roleId}`);
  }
}
```

**When to use**: Complex applications where cache invalidation logic should be centralized

---

## Service-Specific Caching

### auth-service

| Data             | Key Pattern                       | TTL | Invalidation Event         |
| ---------------- | --------------------------------- | --- | -------------------------- |
| Role Permissions | `auth:role_permissions:{roleId}`  | 15m | `role.permissions.updated` |
| Service Config   | `auth:service:{slug}`             | 1h  | `service.updated`          |
| Legal Documents  | `auth:legal_docs:{locale}:{type}` | 30m | `legal_document.published` |
| OAuth Provider   | `auth:oauth_provider:{provider}`  | 1h  | `oauth_config.updated`     |

**High-Value Cache Targets**:

- Role permissions are checked on every authenticated request
- Service configuration is looked up 6+ times per service join flow

### personal-service

| Data             | Key Pattern                       | TTL | Invalidation Event         |
| ---------------- | --------------------------------- | --- | -------------------------- |
| User Preferences | `personal:user_prefs:{userId}`    | 5m  | `user_preferences.updated` |
| Resume Metadata  | `personal:resume_meta:{resumeId}` | 5m  | `resume.updated`           |
| Username to ID   | `personal:user_id:{username}`     | 1h  | `user.deleted`             |

**High-Value Cache Targets**:

- User preferences are accessed on every user request
- Username lookups for public resume access make external HTTP calls

### audit-service

| Data             | Key Pattern                         | TTL | Invalidation Event         |
| ---------------- | ----------------------------------- | --- | -------------------------- |
| Export Status    | `audit:export:{exportId}`           | 24h | `export.completed`         |
| Retention Policy | `audit:retention_policy:{policyId}` | 1h  | `retention_policy.updated` |

**Note**: Currently uses in-memory Map for exports - must migrate to Valkey

### analytics-service

| Data             | Key Pattern                             | TTL | Invalidation Event |
| ---------------- | --------------------------------------- | --- | ------------------ |
| Behavior Summary | `analytics:behavior:{serviceId}:{date}` | 5m  | Scheduled refresh  |
| Session Summary  | `analytics:session:{serviceId}:{date}`  | 5m  | Scheduled refresh  |

**Note**: Consider using ClickHouse Materialized Views instead of cache for analytics data

---

## Implementation Examples

### Basic Cache-Aside Service

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RolePermissionsService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private prisma: PrismaService,
  ) {}

  async getPermissions(roleId: string): Promise<string[]> {
    const cacheKey = `auth:role_permissions:${roleId}`;

    // Step 1: Check cache
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);

    // Step 2: Query database
    const permissions = await this.prisma.$queryRaw<{ key: string }[]>`
      SELECT CONCAT(p.resource, ':', p.action) as key
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ${roleId}
    `;

    const result = permissions.map((p) => p.key);

    // Step 3: Store in cache
    await this.cache.set(cacheKey, result, 900000); // 15 minutes

    return result;
  }
}
```

### Reusable Cache Wrapper

For repeated patterns, create a reusable wrapper:

```typescript
@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl: number = 300000): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined) return cached;

    const data = await fetcher();
    await this.cache.set(key, data, ttl);
    return data;
  }

  async invalidate(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const redis = (this.cache as any).store.getClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### Usage with CacheService

```typescript
@Injectable()
export class ServiceConfigService {
  constructor(
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {}

  async getServiceBySlug(slug: string): Promise<Service> {
    return this.cacheService.getOrFetch(
      `auth:service:${slug}`,
      () => this.prisma.service.findUnique({ where: { slug } }),
      3600000, // 1 hour
    );
  }
}
```

---

## Anti-Patterns to Avoid

### 1. Caching Everything

**Problem**: Bloats memory, increases complexity, may cause stale data issues

**Solution**: Only cache hot paths identified through profiling

### 2. No TTL

**Problem**: Memory grows indefinitely, data never refreshes

**Solution**: Always set explicit TTL values

### 3. Caching Mutable Entities Directly

**Problem**: Complex invalidation, consistency issues

**Solution**: Cache derived/read-only views of data

### 4. Cache Key Collisions

**Problem**: Wrong data returned, security issues

**Solution**: Use structured, namespaced key format

### 5. N+1 Cache Calls in Loops

**Problem**: Defeats the purpose of caching, adds latency

**Solution**: Batch fetch with `mget` or restructure data access

---

## Monitoring and Observability

### Key Metrics

| Metric                | Target    | Alert Threshold |
| --------------------- | --------- | --------------- |
| Cache Hit Rate        | > 80%     | < 60%           |
| Average Latency (GET) | < 1ms     | > 5ms           |
| Memory Usage          | < 70% max | > 85%           |
| Eviction Rate         | Low       | Sudden spike    |
| Connection Pool Usage | < 80%     | > 90%           |

### Logging

```typescript
// Development: Log all cache operations
this.logger.debug(`Cache ${cached ? 'HIT' : 'MISS'}: ${key}`);

// Production: Log only misses and errors
if (!cached) {
  this.logger.debug(`Cache MISS: ${key}`);
}
```

### Health Check

```typescript
@Injectable()
export class CacheHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.cache.set('health_check', 'ok', 1000);
      const result = await this.cache.get('health_check');

      return this.getStatus(key, result === 'ok');
    } catch (error) {
      return this.getStatus(key, false, { error: error.message });
    }
  }
}
```

---

## Environment Configuration

### Required Environment Variables

```env
# Valkey Connection
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=your-secret-password
VALKEY_DB=0

# Cache Settings
CACHE_DEFAULT_TTL=300000      # 5 minutes in milliseconds
CACHE_ENABLED=true            # Feature flag to disable caching
```

### Per-Environment Settings

| Environment | TTL Multiplier | Notes                   |
| ----------- | -------------- | ----------------------- |
| Development | 0.1x           | Short TTLs for testing  |
| Staging     | 0.5x           | Moderate TTLs           |
| Production  | 1.0x           | Full TTLs as documented |

---

## Migration Plan

### Phase 1: Infrastructure Setup

1. Deploy Valkey instance (or use AWS ElastiCache for Valkey)
2. Configure network access and security groups
3. Set up monitoring dashboards

### Phase 2: High-Value Caches

1. Implement role permissions caching (auth-service)
2. Implement service configuration caching (auth-service)
3. Migrate export store from in-memory Map to Valkey (audit-service)

### Phase 3: Secondary Caches

1. User preferences caching (personal-service)
2. Username-to-ID lookup caching (personal-service)
3. Legal document caching (auth-service)

### Phase 4: Optimization

1. Add cache warming for critical data
2. Implement pattern-based invalidation
3. Set up event-driven invalidation
4. Performance tuning based on metrics

---

## References

- [NestJS Caching Documentation](https://docs.nestjs.com/techniques/caching)
- [Valkey Official Documentation](https://valkey.io/docs/)
- [AWS ElastiCache for Valkey](https://aws.amazon.com/elasticache/valkey/)
- [cache-manager npm package](https://www.npmjs.com/package/cache-manager)
- [Cache-Aside Pattern (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
