# my-girok Service Optimization Report

> Generated: 2025-12-28 | Branch: feat/global-account-system

## Executive Summary

This report provides a comprehensive analysis of all services for:

- **UUIDv7 Compliance**: 5 non-compliant files found
- **SQL Injection Risks**: 2 medium-risk patterns (mitigated), all others safe
- **Query Optimization**: 25+ optimization opportunities identified
- **Caching Strategy**: Cache-aside pattern with Valkey recommended

---

## 1. 2025 Best Practices Reference

### Core Principles (KISS + YAGNI)

| Principle | Description              | Application                                        |
| --------- | ------------------------ | -------------------------------------------------- |
| **KISS**  | Keep It Simple, Stupid   | Avoid complex abstractions for one-time operations |
| **YAGNI** | You Aren't Gonna Need It | Only implement features when actually needed       |
| **DRY**   | Don't Repeat Yourself    | Extract only when pattern appears 3+ times         |

### Caching Strategy: Cache-Aside Pattern

The user-requested pattern: **Check cache first, then DB if miss**

```
Request → Check Valkey → Hit? → Return cached data
                       ↓
                      Miss → Query DB → Store in Valkey → Return data
```

**2025 Implementation with NestJS + Valkey:**

- Use `@nestjs/cache-manager` with `cache-manager-ioredis-yet`
- Valkey (Redis fork): 40% memory reduction, 230% scaling improvement vs Redis
- TTL strategy: 5-15 min for permissions, 1 hour for static config

### N+1 Prevention

- **Simple**: Use JOINs instead of loops
- **Medium datasets**: Batch loading with `IN (...)` clause
- **Large datasets**: Separate queries with pagination

### ClickHouse Optimization

- **Incremental Materialized Views**: Real-time updates at insert time
- **Refreshable Materialized Views**: Periodic recompute for sub-ms latency
- **Design for immutability**: Append-only workloads

---

## 2. UUIDv7 Compliance Audit

### Non-Compliant Files (5 files)

| File                                              | Line               | Issue                                        | Fix Required                                     |
| ------------------------------------------------- | ------------------ | -------------------------------------------- | ------------------------------------------------ |
| `personal-service/src/storage/storage.service.ts` | 4                  | `import { v4 as uuid } from 'uuid'`          | Use `ID.generate()` from `@my-girok/nest-common` |
| `personal-service/src/storage/storage.service.ts` | 135, 175, 264, 337 | `uuid()` calls                               | Replace with `ID.generate()`                     |
| `auth-service/prisma/schema.prisma`               | 23 locations       | `@default(dbgenerated("gen_random_uuid()"))` | Application-side ID generation                   |
| `personal-service/prisma/schema.prisma`           | 13 locations       | `@default(dbgenerated("gen_random_uuid()"))` | Application-side ID generation                   |
| SQL Migrations                                    | 27+ locations      | `DEFAULT gen_random_uuid()`                  | Historical - acceptable                          |

### Compliant Patterns (Reference)

```typescript
// CORRECT: UUIDv7 from nest-common
import { ID } from '@my-girok/nest-common';
const id = ID.generate(); // Time-sortable, RFC 9562 compliant

// CORRECT: Already migrated files
// - audit-service: 0 issues
// - analytics-service: 0 issues
```

### Priority Actions

1. **HIGH**: Fix `storage.service.ts` (4 uuid() calls)
2. **MEDIUM**: Schema defaults (acceptable for now - IDs generated in app layer)
3. **LOW**: Historical migrations (no action needed)

---

## 3. SQL Injection Vulnerability Audit

### Summary

| Risk Level | Count | Status                    |
| ---------- | ----- | ------------------------- |
| HIGH       | 0     | N/A                       |
| MEDIUM     | 2     | Mitigated with validation |
| LOW        | 4     | Safe (parameterized)      |

### Medium-Risk Patterns (Mitigated)

#### 1. ClickHouse ALTER TABLE (analytics-service)

**File:** `ingestion.service.ts:129-133`

```typescript
// MITIGATED: Has UUID validation but still uses string interpolation
await this.clickhouse.command(
  `ALTER TABLE ${mutationTable} ` +
    `UPDATE user_id = '${dto.userId}' ` +
    `WHERE anonymous_id = '${dto.anonymousId}' AND user_id IS NULL`,
);
```

**Mitigation:** UUID regex validation + table whitelist
**Recommendation:** Add comprehensive test coverage for edge cases

#### 2. ClickHouse DROP PARTITION (audit-service)

**File:** `retention.service.ts:181-184`

```typescript
// MITIGATED: All values validated
await this.clickhouse.command(
  `ALTER TABLE ${policy.databaseName}.${policy.tableName}_local ` +
    `ON CLUSTER '${clusterName}' DROP PARTITION '${partition}'`,
);
```

**Mitigation:**

- `databaseName/tableName`: Hardcoded whitelist
- `clusterName`: Regex `/^[a-zA-Z0-9_]+$/`
- `partition`: Regex `/^\d{6,8}$/`

### Safe Patterns (Reference)

| Pattern                | Example                                    | Status |
| ---------------------- | ------------------------------------------ | ------ |
| Prisma tagged template | `$queryRaw\`SELECT ... WHERE id = ${id}\`` | SAFE   |
| ClickHouse params      | `{userId:UUID}` with params object         | SAFE   |
| COALESCE pattern       | `WHERE (col = ${val} OR ${val} IS NULL)`   | SAFE   |
| Hardcoded enum mapping | `getDateTruncFunction(interval)`           | SAFE   |

---

## 4. Service Optimization Analysis

### 4.1 Auth-Service

#### Duplicate DB Calls (3 major issues)

| Issue                                      | Location                          | Impact                         |
| ------------------------------------------ | --------------------------------- | ------------------------------ |
| Permission fetch with wildcard count check | `admin-auth.service.ts:223-243`   | 2 queries per login            |
| Service lookup duplicated 6x               | `services.service.ts:81-463`      | Same query 6 times per request |
| Personal info existence + refetch          | `personal-info.service.ts:94-175` | 2 queries when 1 suffices      |

#### N+1 Patterns (2 issues)

| Issue                             | Location                        | Impact                         |
| --------------------------------- | ------------------------------- | ------------------------------ |
| Loop permission fetch per service | `admin-auth.service.ts:309-324` | N+1 queries for admin services |
| Individual consent INSERTs        | `services.service.ts:560-574`   | N queries per service join     |

#### Cache Candidates (HIGH VALUE)

| Data                  | TTL      | Key Format                   | DB Load Reduction |
| --------------------- | -------- | ---------------------------- | ----------------- |
| Role Permissions      | 5-15 min | `role_permissions:{roleId}`  | 70-80%            |
| Service Config        | 1 hour   | `service:{slug}`             | 50-70%            |
| Legal Documents       | 30 min   | `legal_docs:{locale}:{type}` | 40-60%            |
| OAuth Provider Config | 10 min   | `oauth_provider:{provider}`  | 60-70%            |

---

### 4.2 Personal-Service

#### Duplicate DB Calls (9+ methods affected)

**Root Cause:** `findByIdAndUserId()` loads entire resume with all relations for simple ownership verification.

```typescript
// PROBLEM: Loads 4-level deep relations just to verify ownership
async findByIdAndUserId(resumeId: string, userId: string) {
  return await this.prisma.resume.findFirst({
    where: { id: resumeId, userId, deletedAt: null },
    include: this.RESUME_FULL_INCLUDE,  // Loads EVERYTHING
  });
}
```

**Affected Methods:**

- `update()`: Lines 374, 561
- `setDefaultResume()`: Line 830
- `updateSectionOrder()`: Lines 868, 882 (loads twice!)
- `toggleSectionVisibility()`: Lines 886, 900 (loads twice!)
- `delete()`: Line 588
- `uploadAttachment()`: Line 1024
- `getAttachments()`: Line 1071
- `deleteAttachment()`: Line 1096
- `reorderAttachments()`: Line 1165

**Fix:** Create lightweight `verifyOwnership()` method:

```typescript
private async verifyOwnership(resumeId: string, userId: string): Promise<void> {
  const exists = await this.prisma.resume.count({
    where: { id: resumeId, userId, deletedAt: null },
  });
  if (!exists) throw new NotFoundException('Resume not found');
}
```

#### N+1 Pattern

**Issue:** `reorderAttachments()` (lines 1169-1173) creates N update promises:

```typescript
// PROBLEM: N separate UPDATE queries
const updates = attachmentIds.map((id, index) =>
  tx.resumeAttachment.updateMany({
    where: { id, resumeId, type },
    data: { order: index },
  }),
);
await Promise.all(updates);
```

**Fix:** Use raw SQL batch update:

```sql
UPDATE resume_attachments SET order = CASE id
  WHEN '...' THEN 0
  WHEN '...' THEN 1
  ...
END WHERE id IN (...)
```

#### Cache Candidates

| Data                        | TTL    | Key Format                   |
| --------------------------- | ------ | ---------------------------- |
| User Preferences            | 10 min | `user_prefs:{userId}`        |
| Username → UserId mapping   | 1 hour | `user_id:{username}`         |
| Resume sections (read-only) | 5 min  | `resume_sections:{resumeId}` |

---

### 4.3 Audit-Service

#### Multiple Scans on Same Table (3 issues)

| Issue                              | Location                             | Queries            |
| ---------------------------------- | ------------------------------------ | ------------------ |
| Count + Data queries               | `audit-query.service.ts:55-81`       | 2 sequential       |
| Count + Data queries               | `admin-action.service.ts:59-86`      | 2 sequential       |
| 3 stats queries on consent_history | `consent-history.service.ts:168-225` | 3 scans same table |

**Fix for consent stats:** Single query with multiple aggregations:

```sql
SELECT
  count() as total,
  countIf(agreed = true) as agreed,
  countIf(agreed = false) as disagreed,
  groupArray((consent_type, countIf(agreed), countIf(NOT agreed))) as by_type,
  groupArray((country_code, countIf(agreed), countIf(NOT agreed))) as by_country
FROM audit_db.consent_history
WHERE ...
```

#### Cache Candidate (Critical)

**Issue:** `export.service.ts` uses in-memory Map (line 6):

```typescript
const exportStore = new Map<string, ExportResponseDto>(); // Memory leak!
```

**Fix:** Move to Valkey with TTL:

```typescript
@Injectable()
export class ExportService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async storeExport(id: string, data: ExportResponseDto): Promise<void> {
    await this.cache.set(`export:${id}`, data, 86400000); // 24h TTL
  }
}
```

---

### 4.4 Analytics-Service

#### Critical: BehaviorService.getSummary() - 6 Parallel Queries

**File:** `behavior.service.ts:18-36`

```typescript
// PROBLEM: 6 separate queries on same events table
const [totalEvents, uniqueUsers, uniqueSessions, topEvents, eventsByCategory, timeSeries] =
  await Promise.all([
    this.getTotalEvents(query),      // Scan 1
    this.getUniqueUsers(query),      // Scan 2
    this.getUniqueSessions(query),   // Scan 3
    this.getTopEvents(...),          // Scan 4
    this.getEventsByCategory(query), // Scan 5
    this.getTimeSeries(query),       // Scan 6
  ]);
```

**Fix Options:**

1. **Simple (2025 recommended):** Incremental Materialized View
2. **Medium:** Single query with multiple aggregations
3. **Complex:** Pre-compute daily summaries

**Recommended MV approach:**

```sql
CREATE MATERIALIZED VIEW analytics_db.behavior_summary_mv
ENGINE = SummingMergeTree()
ORDER BY (event_date, service_id)
AS SELECT
  toDate(timestamp) as event_date,
  service_id,
  count() as total_events,
  uniq(user_id) as unique_users,
  uniq(session_id) as unique_sessions
FROM analytics_db.events
GROUP BY event_date, service_id
```

#### SessionService: 4+4 Dimension Queries

**File:** `session.service.ts:15-30, 150-165`

- `getSummary()`: 4 queries (basic + 3 dimensions)
- `getDistribution()`: 4 queries (duration + pageViews + hourly + daily)

**Fix:** Combine into 1-2 queries per method using ClickHouse's multiple GROUP BY.

#### FunnelService: N-1 Sequential Queries

**File:** `funnel.service.ts:221-259`

```typescript
// PROBLEM: For 5-step funnel, executes 4 sequential queries
for (let i = 0; i < steps.length - 1; i++) {
  const result = await this.clickhouse.query(sql, { currentStep, nextStep, ... });
  avgTimes.push(...);
}
```

**Fix:** Single query with window functions for all step transitions.

---

## 5. Caching Strategy Implementation

### 5.1 Setup (2025 Best Practice)

**Install:**

```bash
pnpm add @nestjs/cache-manager cache-manager cache-manager-ioredis-yet ioredis
```

**Module Configuration:**

```typescript
// packages/nest-common/src/cache/cache.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          host: configService.get('VALKEY_HOST', 'localhost'),
          port: configService.get('VALKEY_PORT', 6379),
          ttl: 300000, // 5 min default (in ms for v5+)
        }),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class CacheConfigModule {}
```

### 5.2 Cache-Aside Pattern Implementation

**Simple Service Pattern (KISS):**

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RolePermissionsService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private prisma: PrismaService,
  ) {}

  async getPermissions(roleId: string): Promise<string[]> {
    const cacheKey = `role_permissions:${roleId}`;

    // 1. Check cache first
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) return cached;

    // 2. Cache miss - query DB
    const permissions = await this.prisma.$queryRaw<{ key: string }[]>`
      SELECT CONCAT(p.resource, ':', p.action) as key
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ${roleId}
    `;

    const result = permissions.map((p) => p.key);

    // 3. Store in cache
    await this.cache.set(cacheKey, result, 900000); // 15 min TTL

    return result;
  }

  async invalidatePermissions(roleId: string): Promise<void> {
    await this.cache.del(`role_permissions:${roleId}`);
  }
}
```

### 5.3 Custom @Cacheable Decorator (Optional - YAGNI check first)

Only implement if used in 3+ locations:

```typescript
// packages/nest-common/src/cache/cacheable.decorator.ts
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export function Cacheable(keyPrefix: string, ttlMs: number = 300000) {
  const injectCache = Inject(CACHE_MANAGER);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    injectCache(target, 'cache');
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache: Cache = (this as any).cache;
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;

      const cached = await cache.get(cacheKey);
      if (cached !== undefined) return cached;

      const result = await originalMethod.apply(this, args);
      await cache.set(cacheKey, result, ttlMs);
      return result;
    };

    return descriptor;
  };
}
```

**Usage:**

```typescript
@Injectable()
export class ServiceConfigService {
  @Cacheable('service', 3600000) // 1 hour
  async getServiceBySlug(slug: string): Promise<Service> {
    return this.prisma.service.findUnique({ where: { slug } });
  }
}
```

### 5.4 Cache Invalidation Strategy

| Trigger                 | Action         | Keys to Invalidate          |
| ----------------------- | -------------- | --------------------------- |
| Role permission update  | DELETE         | `role_permissions:{roleId}` |
| Service config update   | DELETE         | `service:{slug}`            |
| User preferences update | DELETE         | `user_prefs:{userId}`       |
| Legal document publish  | DELETE pattern | `legal_docs:*`              |

**Pattern-based invalidation:**

```typescript
async invalidatePattern(pattern: string): Promise<void> {
  const redis = (this.cache as any).store.getClient();
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(...keys);
}
```

---

## 6. Implementation Priority

### Phase 1: Quick Wins (1-2 days)

| Task                                     | Impact              | Effort  |
| ---------------------------------------- | ------------------- | ------- |
| Fix `storage.service.ts` uuid() calls    | UUIDv7 compliance   | 30 min  |
| Add `verifyOwnership()` to ResumeService | 50% query reduction | 2 hours |
| Parallelize ExportService queries        | 60% faster exports  | 1 hour  |

### Phase 2: Caching Foundation (3-5 days)

| Task                                | Impact                         | Effort  |
| ----------------------------------- | ------------------------------ | ------- |
| Setup CacheConfigModule with Valkey | Infrastructure                 | 4 hours |
| Cache role permissions              | 70-80% auth query reduction    | 2 hours |
| Cache service config                | 50-70% service query reduction | 2 hours |
| Move ExportService to Valkey        | Fix memory leak                | 2 hours |

### Phase 3: ClickHouse Optimization (1 week)

| Task                                      | Impact              | Effort  |
| ----------------------------------------- | ------------------- | ------- |
| Create behavior_summary_mv                | 80% query reduction | 1 day   |
| Merge ConsentHistoryService stats queries | 60% query reduction | 4 hours |
| Batch funnel step time queries            | Remove N-1 pattern  | 4 hours |

### Phase 4: Advanced (2 weeks)

| Task                                 | Impact                     | Effort  |
| ------------------------------------ | -------------------------- | ------- |
| Async view count updates with BullMQ | Non-blocking public resume | 1 day   |
| User preferences caching             | Every request faster       | 4 hours |
| Username→userId caching              | Reduce HTTP calls          | 4 hours |

---

## 7. Monitoring Recommendations

### Key Metrics to Track

| Metric                     | Target  | Alert Threshold |
| -------------------------- | ------- | --------------- |
| Cache hit rate             | > 80%   | < 60%           |
| DB query count per request | < 5     | > 15            |
| P95 latency                | < 200ms | > 500ms         |
| Valkey memory usage        | < 1GB   | > 2GB           |

### Logging Pattern

```typescript
this.logger.debug(`Cache ${cached ? 'HIT' : 'MISS'} for key: ${cacheKey}`);
```

---

## Sources

### 2025 Best Practices

- [NestJS Caching with Redis (Dec 2025)](https://medium.com/@atolagbedt/building-high-performance-apis-with-redis-cache-in-nestjs-lessons-from-scaling-sooseed-4ce1016f1b3d)
- [AWS re:Invent 2025 - ElastiCache Valkey](https://aws.amazon.com/blogs/database/amazon-elasticache-reinvent-2025-recap/)
- [NestJS Official Caching Docs](https://docs.nestjs.com/techniques/caching)
- [ClickHouse Materialized Views Best Practices](https://clickhouse.com/docs/best-practices/use-materialized-views)

### KISS/YAGNI Principles

- [Avoid Overengineering with KISS, DRY, YAGNI](https://medium.com/@marwah.shwaiki/avoid-overengineering-in-software-development-make-it-simple-with-kiss-dry-yagni-and-mvp-4d03ea195db3)
- [YAGNI Principle in Software Development](https://swenotes.com/2025/09/19/understanding-the-yagni-principle-in-software-development/)

### N+1 Prevention

- [N+1 Query Problem Solutions](https://www.pingcap.com/article/how-to-efficiently-solve-the-n1-query-problem/)
- [Database Management Best Practices 2025](https://cloudvara.com/database-management-best-practices/)

### NestJS Cache Decorators

- [Custom @Cacheable Decorator](https://dev.to/marrouchi/enhance-your-nestjs-performance-with-a-custom-cacheable-decorator-589o)
- [nestjs-cache-decorator Package](https://www.npmjs.com/package/nestjs-cache-decorator)
