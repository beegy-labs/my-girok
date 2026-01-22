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
Data Ingestion → Services/OTEL Collector/Browser SDK
                        ↓
                  Kafka (Redpanda) Buffer Layer
                        ↓
                 ClickHouse Cluster
            ┌──────────┬──────────┬─────────────┐
            │ otel_db  │ audit_db │analytics_db │
            └──────────┴──────────┴─────────────┘
```

## Kafka Topics

| Topic                | Consumer Group        | Target Database | Purpose              |
| -------------------- | --------------------- | --------------- | -------------------- |
| `otel-traces`        | clickhouse-traces     | otel_db         | Distributed traces   |
| `otel-metrics`       | clickhouse-metrics    | otel_db         | OTEL metrics         |
| `otel-logs`          | clickhouse-logs       | otel_db         | Application logs     |
| `otel-audit`         | clickhouse-audit      | audit_db        | Admin audit logs     |
| `analytics-events`   | clickhouse-analytics  | analytics_db    | User events          |
| `session-recordings` | clickhouse-recordings | analytics_db    | rrweb session replay |

## Schema Files

```
infrastructure/clickhouse/schemas/
  01-audit_db.sql           # Audit tables (5-7yr retention)
  02-analytics_db.sql       # Analytics tables
  03-materialized_views.sql # Pre-aggregated views
  04-otel_db.sql            # OTEL traces/metrics/logs
  05-kafka_engine.sql       # Kafka consumers + MVs

infrastructure/clickhouse/migrations/
  001_create_otel_db.sql
  002_create_otel_kafka_engine.sql
  003_create_otel_materialized_views.sql
  004_create_session_recordings.sql
```

## Schema Patterns

```sql
-- UUIDv7 primary keys
id UUID DEFAULT generateUUIDv7()

-- LowCardinality for limited distinct values
action LowCardinality(String)
device_type LowCardinality(String)

-- Monthly partitioning
PARTITION BY toYYYYMM(timestamp)

-- TTL
TTL timestamp + INTERVAL 90 DAY
```

## NestJS Integration

```typescript
import { ClickHouseModule, ClickHouseService, createQueryBuilder } from '@my-girok/nest-common';

@Module({ imports: [ClickHouseModule] })

await clickhouse.query<T>('SELECT * FROM t WHERE id = {id:UUID}', { id });
await clickhouse.insert('table', [{ id, data }]);
await clickhouse.batchInsert('table', largeDataset, 5000);
```

## Environment

```bash
CLICKHOUSE_HOST=clickhouse.internal
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=audit_db
CLICKHOUSE_USERNAME=service_user
CLICKHOUSE_PASSWORD=secret
CLICKHOUSE_ASYNC_INSERT=true
```

## Related Documentation

- **Tables & Monitoring**: `clickhouse-tables.md`
