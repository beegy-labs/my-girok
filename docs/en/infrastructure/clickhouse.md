# ClickHouse Infrastructure

> High-performance analytics database for audit and analytics services

## Databases

| Database       | Owner             | Purpose            | Retention |
| -------------- | ----------------- | ------------------ | --------- |
| `audit_db`     | audit-service     | Compliance logging | 5 years   |
| `analytics_db` | analytics-service | Business analytics | 90d - 1yr |

## Cluster Architecture

```
my_cluster (2 shards x 2 replicas)
├── Shard 1
│   ├── replica-01 (primary)
│   └── replica-02 (standby)
├── Shard 2
│   ├── replica-01 (primary)
│   └── replica-02 (standby)
└── Distributed Tables (Query Router)
```

## Schema Files

```
infrastructure/clickhouse/schemas/
├── 01-audit_db.sql        # Audit tables
├── 02-analytics_db.sql    # Analytics tables
└── 03-materialized_views.sql
```

## audit_db Tables

| Table           | Purpose              | TTL     | Partitioning |
| --------------- | -------------------- | ------- | ------------ |
| access_logs     | API access history   | 5 years | Monthly      |
| consent_history | Consent changes      | 5 years | Monthly      |
| admin_actions   | Admin activity audit | 5 years | Monthly      |
| data_exports    | GDPR export tracking | 5 years | Monthly      |

## analytics_db Tables

| Table         | Purpose                      | TTL     |
| ------------- | ---------------------------- | ------- |
| sessions      | User sessions                | 1 year  |
| events        | User events                  | 90 days |
| page_views    | Page views + Core Web Vitals | 90 days |
| funnel_events | Funnel tracking              | 90 days |
| user_profiles | Aggregated user data         | None    |
| errors        | Frontend errors              | 30 days |

## Materialized Views

| MV Name                | Purpose                 | TTL     |
| ---------------------- | ----------------------- | ------- |
| daily_session_stats_mv | Daily session metrics   | 1 year  |
| hourly_event_counts_mv | Event frequency         | 90 days |
| page_performance_mv    | Core Web Vitals         | 90 days |
| funnel_stats_mv        | Funnel conversion rates | 90 days |
| session_dist_device_mv | Device breakdown        | 90 days |
| utm_campaign_stats_mv  | Campaign attribution    | 90 days |

## Schema Patterns

```sql
-- UUIDv7 primary keys
id UUID DEFAULT generateUUIDv7()

-- LowCardinality for limited distinct values
action LowCardinality(String)       -- ~50 values
device_type LowCardinality(String)  -- desktop, mobile, tablet

-- Monthly partitioning
PARTITION BY toYYYYMM(timestamp)

-- TTL configurations
TTL timestamp + INTERVAL 90 DAY
TTL retention_until  -- Custom column-based TTL
```

## Query Builder (SQL Injection Prevention)

```typescript
import { createQueryBuilder } from '@my-girok/nest-common';

const builder = createQueryBuilder()
  .whereBetween('timestamp', startDate, endDate, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID')
  .whereIn('action', ['login', 'logout'], 'String');

const { whereClause, params } = builder.build();
const result = await clickhouse.query(sql + whereClause, params);
```

### Builder Methods

| Method            | Purpose                         |
| ----------------- | ------------------------------- |
| `where()`         | Required condition              |
| `whereOptional()` | Condition if value exists       |
| `whereIn()`       | IN clause                       |
| `whereBetween()`  | Range condition                 |
| `whereNull()`     | IS NULL check                   |
| `build()`         | Returns { whereClause, params } |

## NestJS Integration

```typescript
import { ClickHouseModule, ClickHouseService } from '@my-girok/nest-common';

@Module({
  imports: [ClickHouseModule],
})
export class AppModule {}

// Usage
await clickhouse.query<T>('SELECT * FROM t WHERE id = {id:UUID}', { id });
await clickhouse.insert('table', [{ id, data }]);
await clickhouse.batchInsert('table', largeDataset, 5000); // Auto-chunks
```

## Environment Variables

```bash
CLICKHOUSE_HOST=clickhouse.internal
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=audit_db        # or analytics_db
CLICKHOUSE_USERNAME=service_user
CLICKHOUSE_PASSWORD=secret
CLICKHOUSE_ASYNC_INSERT=true

# For audit service (guaranteed writes)
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true

# For analytics service (higher throughput)
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false

CLICKHOUSE_MAX_RETRIES=3
```

## Monitoring

| Metric          | Target | Alert  |
| --------------- | ------ | ------ |
| Query latency   | <100ms | >500ms |
| Insert latency  | <50ms  | >200ms |
| Memory usage    | <70%   | >85%   |
| Disk usage      | <80%   | >90%   |
| Replication lag | <1s    | >10s   |

### Useful Queries

```sql
-- Active queries
SELECT * FROM system.processes;

-- Table sizes
SELECT database, table, formatReadableSize(sum(bytes_on_disk))
FROM system.parts WHERE active GROUP BY database, table;
```

---

**LLM Reference**: `docs/llm/infrastructure/CLICKHOUSE.md`
