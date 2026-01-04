# Analytics Service

> Business analytics with ClickHouse (90d-2yr retention)

## Service Info

| Property | Value                         |
| -------- | ----------------------------- |
| REST     | :3004                         |
| Database | analytics_db (ClickHouse)     |
| Cache    | Valkey DB 4                   |
| Codebase | `services/analytics-service/` |

## REST API

### Ingestion

```
POST  /v1/ingest/session, /v1/ingest/event
POST  /v1/ingest/pageview, /v1/ingest/error
POST  /v1/ingest/batch, /v1/ingest/identify
```

### Sessions

```
GET  /v1/sessions, /v1/sessions/stats
GET  /v1/sessions/summary, /v1/sessions/distribution
GET  /v1/sessions/:id/timeline
```

### Events & Behavior

```
GET  /v1/events
GET  /v1/behavior/summary, /v1/behavior/top-events
GET  /v1/behavior/by-category, /v1/behavior/user/:userId
```

### Funnels

```
GET  /v1/funnels/:name, /v1/funnels/compare
GET  /v1/funnels/dropoff/:step
```

## ClickHouse Tables

| Table         | TTL     | Purpose          |
| ------------- | ------- | ---------------- |
| sessions      | 1 year  | User sessions    |
| events        | 90 days | User events      |
| page_views    | 90 days | Page views       |
| funnel_events | 90 days | Funnel tracking  |
| user_profiles | -       | Aggregated users |
| errors        | 30 days | Error tracking   |

## Materialized Views

| MV                     | TTL     | Purpose         |
| ---------------------- | ------- | --------------- |
| daily_session_stats    | 1 year  | Daily metrics   |
| hourly_event_counts    | 90 days | Event trends    |
| hourly_session_metrics | 30 days | Hourly trends   |
| session_distributions  | 90 days | Device/Browser  |
| utm_campaign_stats     | 90 days | Campaign attr.  |
| funnel_stats           | 90 days | Funnel conv.    |
| page_performance_stats | 90 days | Core Web Vitals |

## Caching (Valkey DB 4)

| Key Pattern                             | TTL |
| --------------------------------------- | --- |
| `analytics:behavior:{serviceId}:{date}` | 5m  |
| `analytics:funnel:{funnelId}:{date}`    | 15m |

## Environment

```bash
PORT=3004
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_DATABASE=analytics_db
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false  # High throughput
VALKEY_HOST=localhost
VALKEY_DB=4
```

## Query Examples

```sql
-- Session distributions (uses MV)
SELECT dimension_value, session_count, bounce_count
FROM session_distributions
WHERE dimension_type = 'device' AND date >= today() - 7;

-- UTM campaign performance (uses MV)
SELECT utm_source, session_count, conversion_count
FROM utm_campaign_stats WHERE date = today();
```

---

**Schema**: `infrastructure/clickhouse/schemas/02-analytics_db.sql`
**Full docs**: `docs/services/ANALYTICS_SERVICE.md`
