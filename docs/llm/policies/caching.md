# Caching

## Stack

| Component | Tech                  | Version |
| --------- | --------------------- | ------- |
| Store     | Valkey                | 9.x     |
| NestJS    | @nestjs/cache-manager | 3.x     |
| Manager   | cache-manager         | 7.x     |
| KV        | keyv + @keyv/redis    | 5.x     |

## Pattern: Cache-Aside

```
Request -> Cache HIT? -> Return cached
              MISS? -> Query DB -> Store -> Return
```

## Config

```typescript
CacheModule.registerAsync({
  isGlobal: true,
  useFactory: async (config: ConfigService) => ({
    stores: [
      new Keyv({
        store: new KeyvRedis(`redis://${config.get('VALKEY_HOST')}:${config.get('VALKEY_PORT')}`),
      }),
    ],
    ttl: 300000, // 5min (milliseconds!)
  }),
  inject: [ConfigService],
});
```

## Key Format

```
{env}:{service}:{entity}:{id}
```

| Env         | Prefix  |
| ----------- | ------- |
| Development | dev     |
| Staging     | release |
| Production  | prod    |

### CacheKey Helper

```typescript
import { CacheKey } from '@my-girok/nest-common';
CacheKey.make('auth', 'permissions', roleId); // dev:auth:permissions:uuid
CacheKey.pattern('auth', 'permissions', '*'); // dev:auth:permissions:*
```

## Why Valkey

| Benefit  | Value                       |
| -------- | --------------------------- |
| Memory   | 40% reduction vs Redis      |
| Scaling  | 230% improvement            |
| Cost     | 33% AWS ElastiCache savings |
| Protocol | Full Redis compatible       |

## TTL Policy

| Constant        | TTL   | ms       | Use Cases               |
| --------------- | ----- | -------- | ----------------------- |
| STATIC_CONFIG   | 24h   | 86400000 | Services, OAuth, laws   |
| SEMI_STATIC     | 15min | 900000   | Permissions, legal docs |
| USER_DATA       | 5min  | 300000   | Preferences, resume     |
| SESSION         | 30min | 1800000  | Admin sessions          |
| SHORT_LIVED     | 1min  | 60000    | Rate limiting           |
| EPHEMERAL       | 10s   | 10000    | Real-time metrics       |
| USERNAME_LOOKUP | 2h    | 7200000  | Username → userId       |
| EXPORT_STATUS   | 24h   | 86400000 | Export job status       |
| ANALYTICS       | 5min  | 300000   | Behavior summary        |
| FUNNEL          | 15min | 900000   | Funnel data             |

## Service Caching

### auth-service

| Data       | Key                             | TTL | Invalidation             |
| ---------- | ------------------------------- | --- | ------------------------ |
| Role Perms | auth:role_permissions:{id}      | 15m | role.permissions.updated |
| Service    | auth:service:{slug}             | 1h  | service.updated          |
| Legal Docs | auth:legal_docs:{locale}:{type} | 30m | legal_document.published |

### personal-service

| Data        | Key                       | TTL | Invalidation             |
| ----------- | ------------------------- | --- | ------------------------ |
| User Prefs  | personal:user_prefs:{id}  | 5m  | user_preferences.updated |
| Resume Meta | personal:resume_meta:{id} | 5m  | resume.updated           |

## Invalidation

### TTL-Based

```typescript
await this.cache.set(key, data, 900000);
```

### Write-Through

```typescript
await this.prisma.service.update({ where: { slug }, data });
await this.cache.del(`auth:service:${slug}`);
```

### Pattern-Based

```typescript
const redis = (this.cache as any).store.getClient();
const keys = await redis.keys(`auth:role_permissions:${roleId}:*`);
if (keys.length) await redis.del(...keys);
```

### Event-Driven

```typescript
this.eventEmitter.emit('role.permissions.updated', { roleId });

@OnEvent('role.permissions.updated')
async handle({ roleId }) { await this.cache.del(`auth:role_permissions:${roleId}`); }
```

## Wrapper

```typescript
async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl = 300000): Promise<T> {
  const cached = await this.cache.get<T>(key);
  if (cached !== undefined) return cached;
  const data = await fetcher();
  await this.cache.set(key, data, ttl);
  return data;
}
```

## Anti-Patterns

| Problem                | Solution                |
| ---------------------- | ----------------------- |
| Cache everything       | Only hot paths          |
| No TTL                 | Always set TTL          |
| Cache mutable entities | Cache derived/read-only |
| Key collisions         | Namespaced keys         |
| N+1 cache calls        | Batch with mget         |

## Metrics

| Metric      | Target | Alert |
| ----------- | ------ | ----- |
| Hit Rate    | >80%   | <60%  |
| GET Latency | <1ms   | >5ms  |
| Memory      | <70%   | >85%  |

## Env Vars

```env
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=secret
VALKEY_DB=0
CACHE_DEFAULT_TTL=300000
CACHE_ENABLED=true
```
