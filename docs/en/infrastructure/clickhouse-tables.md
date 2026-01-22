# ClickHouse Tables and Monitoring

This document provides a comprehensive reference for ClickHouse tables, materialized views, query building, and monitoring across all databases.

## Database Overview

The system uses three ClickHouse databases for different purposes:

- **otel_db**: OpenTelemetry observability data (traces, metrics, logs)
- **audit_db**: Compliance and audit trail data
- **analytics_db**: User analytics and session data

## otel_db Tables

The observability database stores telemetry data from all services.

| Table                | Purpose                | TTL     | Data Source       |
| -------------------- | ---------------------- | ------- | ----------------- |
| traces               | Distributed traces     | 30 days | Kafka Engine      |
| metrics              | OpenTelemetry metrics  | 90 days | Kafka Engine      |
| logs                 | Application logs       | 30 days | Kafka Engine      |
| service_dependencies | Service dependency map | 90 days | Materialized View |
| service_error_rates  | Aggregated error rates | 30 days | Materialized View |
| log_error_summary    | Log error aggregations | 7 days  | Materialized View |

## audit_db Tables

The audit database maintains compliance and regulatory data with extended retention periods.

| Table            | Purpose               | TTL     | Partitioning |
| ---------------- | --------------------- | ------- | ------------ |
| access_logs      | API access history    | 5 years | Monthly      |
| consent_history  | User consent changes  | 5 years | Monthly      |
| admin_actions    | Admin activity audit  | 5 years | Monthly      |
| data_exports     | GDPR export tracking  | 5 years | Monthly      |
| admin_ui_events  | Admin UI tracking     | 7 years | Monthly      |
| admin_api_logs   | Admin API requests    | 7 years | Monthly      |
| admin_audit_logs | Data change audit     | 7 years | Monthly      |
| admin_sessions   | Admin session records | 2 years | Monthly      |

## analytics_db Tables

The analytics database stores user behavior and performance data.

| Table                      | Purpose                         | TTL     |
| -------------------------- | ------------------------------- | ------- |
| sessions                   | User session records            | 1 year  |
| events                     | User interaction events         | 90 days |
| page_views                 | Page views with Core Web Vitals | 90 days |
| funnel_events              | Conversion funnel tracking      | 90 days |
| user_profiles              | Aggregated user data            | None    |
| errors                     | Frontend error logs             | 30 days |
| session_recordings         | rrweb event batches             | 90 days |
| session_recording_metadata | Session-level aggregates        | 90 days |

## Materialized Views

Materialized views provide pre-aggregated data for common queries.

| View Name              | Purpose                    | TTL     |
| ---------------------- | -------------------------- | ------- |
| daily_session_stats_mv | Daily session metrics      | 1 year  |
| hourly_event_counts_mv | Hourly event frequency     | 90 days |
| page_performance_mv    | Core Web Vitals aggregates | 90 days |
| funnel_stats_mv        | Funnel conversion rates    | 90 days |
| session_dist_device_mv | Device type breakdown      | 90 days |
| utm_campaign_stats_mv  | Campaign attribution       | 90 days |

## Query Builder

The `@my-girok/nest-common` package provides a query builder to prevent SQL injection.

### Usage Example

```typescript
import { createQueryBuilder } from '@my-girok/nest-common';

const builder = createQueryBuilder()
  .whereBetween('timestamp', startDate, endDate, 'DateTime64')
  .whereOptional('user_id', '=', userId, 'UUID')
  .whereIn('action', ['login', 'logout'], 'String');

const { whereClause, params } = builder.build();
const result = await clickhouse.query(sql + whereClause, params);
```

### Available Methods

| Method            | Purpose                              |
| ----------------- | ------------------------------------ |
| `where()`         | Add a required condition             |
| `whereOptional()` | Add a condition only if value exists |
| `whereIn()`       | Add an IN clause                     |
| `whereBetween()`  | Add a range condition                |
| `whereNull()`     | Add an IS NULL check                 |
| `build()`         | Returns `{ whereClause, params }`    |

## Monitoring

### Performance Targets

| Metric          | Target | Alert Threshold |
| --------------- | ------ | --------------- |
| Query latency   | <100ms | >500ms          |
| Insert latency  | <50ms  | >200ms          |
| Memory usage    | <70%   | >85%            |
| Disk usage      | <80%   | >90%            |
| Replication lag | <1s    | >10s            |

### Useful Queries

#### View Active Queries

```sql
SELECT * FROM system.processes;
```

#### Check Table Sizes

```sql
SELECT
  database,
  table,
  formatReadableSize(sum(bytes_on_disk)) as size
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC;
```

## Related Documentation

- **Main ClickHouse Guide**: See `clickhouse.md`

---

_This document is auto-generated from `docs/llm/infrastructure/clickhouse-tables.md`_
