# ClickHouse Infrastructure

> High-performance analytics database for audit and analytics services

## Overview

ClickHouse is used for two distinct databases with different retention and access patterns:

| Database       | Owner             | Purpose            | Retention |
| -------------- | ----------------- | ------------------ | --------- |
| `audit_db`     | audit-service     | Compliance logging | 5 years   |
| `analytics_db` | analytics-service | Business analytics | 90d - 1yr |

## Cluster Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    my_cluster                                │
├─────────────────────────────────────────────────────────────┤
│  Shard 1                      │  Shard 2                    │
│  ┌────────────┐               │  ┌────────────┐             │
│  │ replica-01 │               │  │ replica-01 │             │
│  │ (primary)  │               │  │ (primary)  │             │
│  └────────────┘               │  └────────────┘             │
│         │                     │         │                   │
│  ┌────────────┐               │  ┌────────────┐             │
│  │ replica-02 │               │  │ replica-02 │             │
│  │ (standby)  │               │  │ (standby)  │             │
│  └────────────┘               │  └────────────┘             │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Distributed      │
                    │  Tables           │
                    │  (Query Router)   │
                    └───────────────────┘
```

## Schema Files

```
infrastructure/clickhouse/schemas/
├── 01-audit_db.sql           # Audit database tables
├── 02-analytics_db.sql       # Analytics database tables
└── 03-materialized_views.sql # Pre-aggregated views
```

## Database: audit_db

### Tables

| Table           | Purpose              | TTL     | Partitioning |
| --------------- | -------------------- | ------- | ------------ |
| access_logs     | API access history   | 5 years | Monthly      |
| consent_history | Consent changes      | 5 years | Monthly      |
| admin_actions   | Admin activity audit | 5 years | Monthly      |
| data_exports    | GDPR export tracking | 5 years | Monthly      |

### Schema Example: access_logs

```sql
CREATE TABLE IF NOT EXISTS audit_db.access_logs_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),   -- UUIDv7 (RFC 9562)
    timestamp DateTime64(3),
    user_id UUID,
    action LowCardinality(String),      -- 'login', 'logout', etc.
    resource String,
    ip_address String,
    user_agent String,
    metadata String,                    -- JSON
    retention_until Date,
    is_exported Bool DEFAULT false
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/audit/access_logs',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toDate(timestamp), user_id, id)
TTL retention_until;

-- Distributed table for queries
CREATE TABLE IF NOT EXISTS audit_db.access_logs ON CLUSTER 'my_cluster'
AS audit_db.access_logs_local
ENGINE = Distributed('my_cluster', 'audit_db', 'access_logs_local', xxHash64(toString(user_id)));
```

## Database: analytics_db

### Tables

| Table         | Purpose              | TTL     | Partitioning |
| ------------- | -------------------- | ------- | ------------ |
| sessions      | User sessions        | 1 year  | Monthly      |
| events        | User events          | 90 days | Monthly      |
| page_views    | Page views + CWV     | 90 days | Monthly      |
| funnel_events | Funnel tracking      | 90 days | Monthly      |
| user_profiles | Aggregated user data | None    | -            |
| errors        | Frontend errors      | 30 days | Monthly      |

### Schema Example: sessions

```sql
CREATE TABLE IF NOT EXISTS analytics_db.sessions_local ON CLUSTER 'my_cluster' (
    session_id UUID DEFAULT generateUUIDv7(),
    user_id Nullable(UUID),
    anonymous_id UUID,
    started_at DateTime64(3),
    ended_at Nullable(DateTime64(3)),
    duration_seconds UInt32 DEFAULT 0,
    is_bounce Bool DEFAULT false,
    entry_page String,
    exit_page String,
    referrer String,
    utm_source Nullable(String),
    utm_medium Nullable(String),
    utm_campaign Nullable(String),
    device_type LowCardinality(String),
    browser LowCardinality(String),
    country_code LowCardinality(String),
    is_converted Bool DEFAULT false
) ENGINE = ReplicatedMergeTree(...)
ORDER BY (toDate(started_at), session_id)
TTL started_at + INTERVAL 1 YEAR;
```

## Materialized Views

Pre-aggregated data for fast dashboard queries.

### Summary Table

| MV Name                     | Target Table           | Engine           | TTL | Purpose                 |
| --------------------------- | ---------------------- | ---------------- | --- | ----------------------- |
| `daily_session_stats_mv`    | daily_session_stats    | SummingMergeTree | 1y  | Daily session metrics   |
| `hourly_event_counts_mv`    | hourly_event_counts    | SummingMergeTree | 90d | Event frequency trends  |
| `hourly_session_metrics_mv` | hourly_session_metrics | SummingMergeTree | 30d | Hourly session trends   |
| `page_performance_mv`       | page_performance_stats | SummingMergeTree | 90d | Core Web Vitals         |
| `funnel_stats_mv`           | funnel_stats           | SummingMergeTree | 90d | Funnel conversion rates |
| `session_dist_device_mv`    | session_distributions  | SummingMergeTree | 90d | Device breakdown        |
| `session_dist_browser_mv`   | session_distributions  | SummingMergeTree | 90d | Browser breakdown       |
| `session_dist_os_mv`        | session_distributions  | SummingMergeTree | 90d | OS breakdown            |
| `session_dist_country_mv`   | session_distributions  | SummingMergeTree | 90d | Country breakdown       |
| `utm_campaign_stats_mv`     | utm_campaign_stats     | SummingMergeTree | 90d | Campaign attribution    |

### MV Example: Daily Session Stats

```sql
-- Target table
CREATE TABLE IF NOT EXISTS analytics_db.daily_session_stats (
    date Date,
    total_sessions UInt64,
    bounce_sessions UInt64,
    converted_sessions UInt64,
    unique_users UInt64,
    total_duration UInt64,
    total_page_views UInt64,
    total_events UInt64
) ENGINE = ReplicatedSummingMergeTree(...)
ORDER BY date
TTL date + INTERVAL 1 YEAR;

-- Materialized View (auto-populates from sessions)
CREATE MATERIALIZED VIEW analytics_db.daily_session_stats_mv
TO analytics_db.daily_session_stats
AS SELECT
    toDate(started_at) as date,
    count() as total_sessions,
    countIf(is_bounce = true) as bounce_sessions,
    countIf(is_converted = true) as converted_sessions,
    uniq(user_id) as unique_users,
    sum(duration_seconds) as total_duration,
    sum(page_view_count) as total_page_views,
    sum(event_count) as total_events
FROM analytics_db.sessions_local
GROUP BY date;
```

### Query Using MVs

```sql
-- Fast: Uses pre-aggregated MV
SELECT date, total_sessions, bounce_sessions
FROM analytics_db.daily_session_stats
WHERE date >= today() - 30
ORDER BY date;

-- Fast: Session distribution by device
SELECT dimension_value, session_count, bounce_count
FROM analytics_db.session_distributions
WHERE dimension_type = 'device' AND date >= today() - 7;

-- Fast: UTM campaign performance
SELECT utm_source, utm_medium, session_count, conversion_count
FROM analytics_db.utm_campaign_stats
WHERE date = today();
```

## Query Builder (SQL Injection Prevention)

Use the `ClickHouseQueryBuilder` from `@my-girok/nest-common`:

```typescript
import { createQueryBuilder } from '@my-girok/nest-common';

const builder = createQueryBuilder()
  .whereBetween('timestamp', startDate, endDate, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID')
  .whereIn('action', ['login', 'logout'], 'String');

const { whereClause, params } = builder.build();

const sql = `SELECT * FROM audit_db.access_logs ${whereClause} LIMIT 100`;
const result = await clickhouse.query(sql, params);
```

### Available Methods

| Method              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `where()`           | Add required condition                      |
| `whereOptional()`   | Add condition if value exists               |
| `whereIn()`         | IN clause with array                        |
| `whereInOptional()` | IN clause if array not empty                |
| `whereBetween()`    | Range condition                             |
| `whereNull()`       | IS NULL check                               |
| `whereNotNull()`    | IS NOT NULL check                           |
| `whereRaw()`        | Raw SQL (use with caution)                  |
| `build()`           | Returns { conditions, params, whereClause } |

## Data Types

### ID Strategy: UUIDv7 (RFC 9562)

All tables use `generateUUIDv7()` for primary keys:

```sql
id UUID DEFAULT generateUUIDv7()
```

Benefits:

- **Time-sortable**: Lexicographic sort = chronological sort
- **DB-native**: No string conversion needed
- **Monotonic**: Ordered within millisecond

### LowCardinality Optimization

Use `LowCardinality(String)` for columns with limited distinct values:

```sql
action LowCardinality(String),      -- ~50 distinct values
device_type LowCardinality(String), -- desktop, mobile, tablet
country_code LowCardinality(String) -- ~200 countries
```

Benefits:

- 10-100x storage reduction
- Faster GROUP BY operations
- Better compression

## Retention & Partitioning

### TTL Configuration

```sql
-- Per-table TTL
TTL timestamp + INTERVAL 90 DAY

-- Custom retention column
TTL retention_until
```

### Partition Strategy

All tables use monthly partitioning:

```sql
PARTITION BY toYYYYMM(timestamp)
```

Benefits:

- Efficient time-range queries
- Easy partition-level cleanup
- Better compression within partitions

## Environment Variables

```bash
# Connection
CLICKHOUSE_HOST=clickhouse.internal
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=audit_db  # or analytics_db
CLICKHOUSE_USERNAME=service_user
CLICKHOUSE_PASSWORD=secret

# Insert behavior
CLICKHOUSE_ASYNC_INSERT=true
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true   # audit: guaranteed writes
# CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false # analytics: high throughput

# Retry
CLICKHOUSE_MAX_RETRIES=3
```

## NestJS Integration

### Module Setup

```typescript
import { ClickHouseModule } from '@my-girok/nest-common';

@Module({
  imports: [ClickHouseModule],
})
export class AppModule {}
```

### Service Usage

```typescript
import { ClickHouseService } from '@my-girok/nest-common';

@Injectable()
export class MyService {
  constructor(private clickhouse: ClickHouseService) {}

  async query() {
    const result = await this.clickhouse.query<MyType>('SELECT * FROM table WHERE id = {id:UUID}', {
      id: someUuid,
    });
    return result.data;
  }

  async insert() {
    await this.clickhouse.insert('table', [{ id, data }]);
  }

  async batchInsert() {
    // Auto-chunks by 10000
    await this.clickhouse.batchInsert('table', largeDataset, 5000);
  }
}
```

## Monitoring

### Key Metrics

| Metric          | Target  | Alert Threshold |
| --------------- | ------- | --------------- |
| Query latency   | < 100ms | > 500ms         |
| Insert latency  | < 50ms  | > 200ms         |
| Memory usage    | < 70%   | > 85%           |
| Disk usage      | < 80%   | > 90%           |
| Replication lag | < 1s    | > 10s           |

### System Tables

```sql
-- Active queries
SELECT * FROM system.processes;

-- Query log
SELECT * FROM system.query_log
WHERE event_date = today()
ORDER BY query_start_time DESC
LIMIT 100;

-- Table sizes
SELECT database, table, formatReadableSize(sum(bytes_on_disk)) as size
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC;
```

## Related Documentation

- **Audit Service**: `docs/services/AUDIT_SERVICE.md`
- **Analytics Service**: `docs/services/ANALYTICS_SERVICE.md`
- **LLM Caching Guide**: `.ai/caching.md`
- **nest-common Package**: `docs/packages/nest-common.md`
