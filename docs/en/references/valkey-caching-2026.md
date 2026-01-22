# Valkey Caching Best Practices - 2026

This guide covers Valkey caching best practices as of 2026, including caching patterns, ioredis compatibility, and session management.

## Valkey Overview

Valkey is a Redis fork that emerged in March 2024 from Redis 7.2.4:

| Feature       | Description                                 |
| ------------- | ------------------------------------------- |
| Origin        | Redis 7.2.4 fork (March 2024)               |
| License       | BSD 3-clause (fully open source)            |
| Backing       | Linux Foundation, AWS, Google Cloud, Oracle |
| Compatibility | 100% Redis OSS 7.2 compatible               |

### Valkey 8.x Performance Improvements

- **37% higher throughput** on write operations
- **30% faster p99 latencies**
- Enhanced I/O multithreading for multi-core processors
- Redesigned threading model for parallel I/O

## Client Options

### Option 1: ioredis (Direct Compatibility)

Existing ioredis code works unchanged with Valkey:

```typescript
import Redis from 'ioredis';

const valkey = new Redis({
  host: process.env.VALKEY_HOST,
  port: 6379,
  password: process.env.VALKEY_PASSWORD,
  maxRetriesPerRequest: 3,
  enableAutoPipelining: true,
  lazyConnect: true,
});
```

### Option 2: Valkey GLIDE (Official Client)

The official Valkey client:

```typescript
import { GlideClient, GlideClusterClient } from '@valkey/valkey-glide';

// Standalone connection
const client = await GlideClient.createClient({
  addresses: [{ host: 'localhost', port: 6379 }],
  credentials: { password: process.env.VALKEY_PASSWORD },
});

// Cluster connection
const cluster = await GlideClusterClient.createClient({
  addresses: [
    { host: 'node1', port: 6379 },
    { host: 'node2', port: 6379 },
  ],
});
```

### Option 3: GLIDE ioredis Adapter

Zero code changes - just change the import:

```typescript
import { Redis } from 'valkey-glide-ioredis-adapter';

// Existing ioredis code works unchanged
const client = new Redis({
  host: 'localhost',
  port: 6379,
});
```

## Caching Patterns

### Cache-Aside (Lazy Loading)

The most common pattern - load data into cache on demand:

```typescript
async function getUser(userId: string): Promise<User | null> {
  const cacheKey = `user:${userId}`;

  // 1. Check cache first
  const cached = await valkey.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss - fetch from database
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  // 3. Store in cache with TTL
  await valkey.setex(cacheKey, 3600, JSON.stringify(user));

  return user;
}
```

### Write-Through

Update cache synchronously with database:

```typescript
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  // 1. Update database
  const user = await db.user.update({
    where: { id: userId },
    data,
  });

  // 2. Update cache synchronously
  await valkey.setex(`user:${userId}`, 3600, JSON.stringify(user));

  return user;
}
```

### Write-Behind (Write-Back)

Write to cache immediately, queue database update:

```typescript
async function updateUserAsync(userId: string, data: Partial<User>): Promise<void> {
  // 1. Write to cache immediately
  const cacheKey = `user:${userId}`;
  const current = await valkey.get(cacheKey);
  const updated = { ...JSON.parse(current || '{}'), ...data };
  await valkey.setex(cacheKey, 3600, JSON.stringify(updated));

  // 2. Queue database update for background processing
  await queue.add('db-sync', { userId, data });
}
```

## Configuration Best Practices

### I/O Threading

```conf
# valkey.conf
# Set io-threads to ~half of CPU cores
# 8-core machine → 4 I/O threads
io-threads 4
io-threads-do-reads yes
```

### Connection Settings

```typescript
const valkey = new Redis({
  host: process.env.VALKEY_HOST,
  port: 6379,
  password: process.env.VALKEY_PASSWORD,

  // Performance optimizations
  enableAutoPipelining: true,
  maxRetriesPerRequest: 5,
  lazyConnect: true,

  // Connection management
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
```

### Cluster Configuration

```typescript
const cluster = new Redis.Cluster(
  [
    { host: 'node1.valkey.local', port: 6379 },
    { host: 'node2.valkey.local', port: 6379 },
    { host: 'node3.valkey.local', port: 6379 },
  ],
  {
    redisOptions: {
      password: process.env.VALKEY_PASSWORD,
    },
    scaleReads: 'slave', // Read from replicas
    enableAutoPipelining: true,
  },
);
```

## Session Management

```typescript
interface Session {
  userId: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

class SessionStore {
  private prefix = 'session:';
  private ttl = 86400; // 24 hours

  async create(sessionId: string, data: Omit<Session, 'createdAt' | 'expiresAt'>): Promise<void> {
    const session: Session = {
      ...data,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.ttl * 1000,
    };
    await valkey.setex(`${this.prefix}${sessionId}`, this.ttl, JSON.stringify(session));
  }

  async get(sessionId: string): Promise<Session | null> {
    const data = await valkey.get(`${this.prefix}${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async refresh(sessionId: string): Promise<boolean> {
    return (await valkey.expire(`${this.prefix}${sessionId}`, this.ttl)) === 1;
  }

  async destroy(sessionId: string): Promise<void> {
    await valkey.del(`${this.prefix}${sessionId}`);
  }
}
```

## Pipeline for Batch Operations

Pipelines are 10x+ faster than individual commands:

```typescript
async function getUsersWithPipeline(userIds: string[]): Promise<User[]> {
  const pipeline = valkey.pipeline();

  for (const id of userIds) {
    pipeline.get(`user:${id}`);
  }

  const results = await pipeline.exec();
  return results
    .filter(([err, data]) => !err && data)
    .map(([, data]) => JSON.parse(data as string));
}
```

## Cache Invalidation

### Key-Based Invalidation

```typescript
// Single key
await valkey.del(`user:${userId}`);

// Pattern-based with SCAN (production-safe)
async function deleteByPattern(pattern: string): Promise<number> {
  let cursor = '0';
  let deleted = 0;

  do {
    const [newCursor, keys] = await valkey.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;
    if (keys.length) {
      deleted += await valkey.del(...keys);
    }
  } while (cursor !== '0');

  return deleted;
}
```

### Tag-Based Invalidation

```typescript
async function setWithTags(key: string, value: string, tags: string[], ttl: number): Promise<void> {
  const pipeline = valkey.pipeline();
  pipeline.setex(key, ttl, value);

  for (const tag of tags) {
    pipeline.sadd(`tag:${tag}`, key);
    pipeline.expire(`tag:${tag}`, ttl);
  }

  await pipeline.exec();
}

async function invalidateTag(tag: string): Promise<void> {
  const keys = await valkey.smembers(`tag:${tag}`);
  if (keys.length) {
    await valkey.del(...keys, `tag:${tag}`);
  }
}
```

## Memory Management Policies

| Policy         | Use Case                         |
| -------------- | -------------------------------- |
| `allkeys-lru`  | General caching                  |
| `volatile-lru` | Mix of cache and persistent data |
| `allkeys-lfu`  | Hot data patterns                |

## Key Naming Conventions

```
{service}:{entity}:{id}
{service}:{entity}:{id}:{attribute}

Examples:
user:123
user:123:profile
order:456:items
session:abc123
```

## Anti-Patterns to Avoid

| Don't                    | Do                    | Reason                |
| ------------------------ | --------------------- | --------------------- |
| `KEYS *` in production   | Use `SCAN`            | Blocks the server     |
| Large values (>100KB)    | Split or compress     | Memory and latency    |
| No TTL on cache keys     | Always set TTL        | Prevents memory leaks |
| Single instance for prod | Use Cluster/Sentinel  | High availability     |
| Ignore connection errors | Implement retry logic | Resilience            |

## Sources

- [Valkey vs Redis 2026](https://betterstack.com/community/comparisons/redis-vs-valkey/)
- [Valkey Migration Documentation](https://valkey.io/topics/migration/)
- [Valkey GLIDE ioredis Migration](https://github.com/valkey-io/valkey-glide/wiki/Migration-Guide-ioredis)
- [GLIDE ioredis Adapter](https://github.com/avifenesh/valkey-glide-ioredis-adapter)
- [Valkey GitHub Repository](https://github.com/valkey-io/valkey)

---

_Last Updated: 2026-01-22_
