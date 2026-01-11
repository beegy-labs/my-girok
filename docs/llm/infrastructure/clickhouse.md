# ClickHouse Infrastructure

High-performance analytics database for observability, audit, and analytics

## Databases

| Database       | Owner               | Purpose               | Retention  |
| -------------- | ------------------- | --------------------- | ---------- |
| `otel_db`      | platform-monitoring | Traces, metrics, logs | 30-90 days |
| `audit_db`     | audit-service       | Compliance logging    | 5-7 years  |
| `analytics_db` | analytics-service   | Business analytics    | 90d - 1yr  |

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           Data Ingestion                │
                    └─────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐          ┌───────────────────┐          ┌───────────────┐
│   Services    │          │  OTEL Collector   │          │   Browser     │
│  (NestJS)     │          │  (traces/metrics) │          │   SDK         │
└───────────────┘          └───────────────────┘          └───────────────┘
        │                             │                             │
        │                             ▼                             │
        │                   ┌───────────────────┐                   │
        │                   │      Kafka        │                   │
        │                   │   (Redpanda)      │                   │
        │                   │  Buffer Layer     │                   │
        │                   └───────────────────┘                   │
        │                             │                             │
        │         ┌───────────────────┼───────────────────┐         │
        │         │                   │                   │         │
        ▼         ▼                   ▼                   ▼         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ClickHouse Cluster                           │
│   ┌──────────┐     ┌──────────┐     ┌─────────────┐                │
│   │ otel_db  │     │ audit_db │     │analytics_db │                │
│   └──────────┘     └──────────┘     └─────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

## Kafka Topics

| Topic              | Consumer Group       | Target Database | Purpose            |
| ------------------ | -------------------- | --------------- | ------------------ |
| `otel-traces`      | clickhouse-traces    | otel_db         | Distributed traces |
| `otel-metrics`     | clickhouse-metrics   | otel_db         | OTEL metrics       |
| `otel-logs`        | clickhouse-logs      | otel_db         | Application logs   |
| `otel-audit`       | clickhouse-audit     | audit_db        | Admin audit logs   |
| `analytics-events` | clickhouse-analytics | analytics_db    | User events        |

## Schema Files

```
infrastructure/clickhouse/schemas/
  01-audit_db.sql           # Audit tables (5-7yr retention)
  02-analytics_db.sql       # Analytics tables
  03-materialized_views.sql # Pre-aggregated views
  04-otel_db.sql            # OTEL traces/metrics/logs
  05-kafka_engine.sql       # Kafka consumers + MVs
```

## otel_db Tables

| Table                | Purpose            | TTL     | Source       |
| -------------------- | ------------------ | ------- | ------------ |
| traces               | Distributed traces | 30 days | Kafka Engine |
| metrics              | OTEL metrics       | 90 days | Kafka Engine |
| logs                 | Application logs   | 30 days | Kafka Engine |
| service_dependencies | Service map (agg)  | 90 days | MV           |
| service_error_rates  | Error rates (agg)  | 30 days | MV           |
| log_error_summary    | Log errors (agg)   | 7 days  | MV           |

## audit_db Tables

| Table            | Purpose              | TTL     | Partitioning |
| ---------------- | -------------------- | ------- | ------------ |
| access_logs      | API access history   | 5 years | Monthly      |
| consent_history  | Consent changes      | 5 years | Monthly      |
| admin_actions    | Admin activity audit | 5 years | Monthly      |
| data_exports     | GDPR export tracking | 5 years | Monthly      |
| admin_ui_events  | Admin UI tracking    | 7 years | Monthly      |
| admin_api_logs   | Admin API requests   | 7 years | Monthly      |
| admin_audit_logs | Data change audit    | 7 years | Monthly      |
| admin_sessions   | Admin sessions       | 2 years | Monthly      |

## analytics_db Tables

| Table         | Purpose              | TTL     |
| ------------- | -------------------- | ------- |
| sessions      | User sessions        | 1 year  |
| events        | User events          | 90 days |
| page_views    | Page views + CWV     | 90 days |
| funnel_events | Funnel tracking      | 90 days |
| user_profiles | Aggregated user data | None    |
| errors        | Frontend errors      | 30 days |

## Materialized Views

| MV Name                | Purpose               | TTL |
| ---------------------- | --------------------- | --- |
| daily_session_stats_mv | Daily session metrics | 1y  |
| hourly_event_counts_mv | Event frequency       | 90d |
| page_performance_mv    | Core Web Vitals       | 90d |
| funnel_stats_mv        | Funnel conversion     | 90d |
| session_dist_device_mv | Device breakdown      | 90d |
| utm_campaign_stats_mv  | Campaign attribution  | 90d |

## Schema Patterns

```sql
-- UUIDv7 primary keys
id UUID DEFAULT generateUUIDv7()

-- LowCardinality for limited distinct values
action LowCardinality(String)       -- ~50 values
device_type LowCardinality(String)  -- desktop, mobile, tablet

-- Monthly partitioning
PARTITION BY toYYYYMM(timestamp)

-- TTL
TTL timestamp + INTERVAL 90 DAY
TTL retention_until  -- Custom column
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

@Module({ imports: [ClickHouseModule] })

// Usage
await clickhouse.query<T>('SELECT * FROM t WHERE id = {id:UUID}', { id });
await clickhouse.insert('table', [{ id, data }]);
await clickhouse.batchInsert('table', largeDataset, 5000);  // Auto-chunks
```

## Environment

```bash
CLICKHOUSE_HOST=clickhouse.internal
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=audit_db        # or analytics_db
CLICKHOUSE_USERNAME=service_user
CLICKHOUSE_PASSWORD=secret
CLICKHOUSE_ASYNC_INSERT=true
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=true   # audit: guaranteed
# CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false # analytics: throughput
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

```sql
-- Active queries
SELECT * FROM system.processes;

-- Table sizes
SELECT database, table, formatReadableSize(sum(bytes_on_disk))
FROM system.parts WHERE active GROUP BY database, table;
```
