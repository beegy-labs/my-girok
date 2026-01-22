# ClickHouse Tables & Monitoring

> Database tables, materialized views, query builder, and monitoring

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

| Table                      | Purpose                  | TTL     |
| -------------------------- | ------------------------ | ------- |
| sessions                   | User sessions            | 1 year  |
| events                     | User events              | 90 days |
| page_views                 | Page views + CWV         | 90 days |
| funnel_events              | Funnel tracking          | 90 days |
| user_profiles              | Aggregated user data     | None    |
| errors                     | Frontend errors          | 30 days |
| session_recordings         | rrweb event batches      | 90 days |
| session_recording_metadata | Session-level aggregates | 90 days |

## Materialized Views

| MV Name                | Purpose               | TTL |
| ---------------------- | --------------------- | --- |
| daily_session_stats_mv | Daily session metrics | 1y  |
| hourly_event_counts_mv | Event frequency       | 90d |
| page_performance_mv    | Core Web Vitals       | 90d |
| funnel_stats_mv        | Funnel conversion     | 90d |
| session_dist_device_mv | Device breakdown      | 90d |
| utm_campaign_stats_mv  | Campaign attribution  | 90d |

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

---

_Main: `clickhouse.md`_
