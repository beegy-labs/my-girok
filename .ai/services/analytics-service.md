# Analytics Service

> Business analytics with ClickHouse (90d-2yr retention)

## Service Info

| Property | Value                         |
| -------- | ----------------------------- |
| REST     | :3004                         |
| gRPC     | N/A                           |
| Database | analytics_db (ClickHouse)     |
| Cache    | Valkey DB 4                   |
| Events   | N/A                           |
| Codebase | `services/analytics-service/` |

## Domain Boundaries

| This Service         | NOT This Service           |
| -------------------- | -------------------------- |
| Session Analytics    | Compliance logging (audit) |
| Event Tracking       | User accounts (identity)   |
| Funnel Analysis      | Authorization (auth)       |
| Campaign Attribution | User data (personal)       |

## REST API

```
POST  /v1/ingest/session, /v1/ingest/event
POST  /v1/ingest/pageview, /v1/ingest/error
POST  /v1/ingest/batch, /v1/ingest/identify

GET   /v1/sessions, /v1/sessions/stats
GET   /v1/sessions/summary, /v1/sessions/distribution
GET   /v1/sessions/:id/timeline

GET   /v1/events
GET   /v1/behavior/summary, /v1/behavior/top-events
GET   /v1/behavior/by-category, /v1/behavior/user/:userId

GET   /v1/funnels/:name, /v1/funnels/compare
GET   /v1/funnels/dropoff/:step
```

## gRPC Server

N/A - REST only

## Database Tables

| Table         | TTL     | Purpose          |
| ------------- | ------- | ---------------- |
| sessions      | 1 year  | User sessions    |
| events        | 90 days | User events      |
| page_views    | 90 days | Page views       |
| funnel_events | 90 days | Funnel tracking  |
| user_profiles | -       | Aggregated users |
| errors        | 30 days | Error tracking   |

## Materialized Views

| MV                  | TTL     | Purpose        |
| ------------------- | ------- | -------------- |
| daily_session_stats | 1 year  | Daily metrics  |
| hourly_event_counts | 90 days | Event trends   |
| utm_campaign_stats  | 90 days | Campaign attr. |
| funnel_stats        | 90 days | Funnel conv.   |

## Events

N/A

## Caching

| Key Pattern                             | TTL |
| --------------------------------------- | --- |
| `analytics:behavior:{serviceId}:{date}` | 5m  |
| `analytics:funnel:{funnelId}:{date}`    | 15m |

## Environment

```bash
PORT=3004
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_DATABASE=analytics_db
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false
VALKEY_HOST=localhost
VALKEY_DB=4
```

---

**Schema**: `infrastructure/clickhouse/schemas/02-analytics_db.sql`
**Full docs**: `docs/services/ANALYTICS_SERVICE.md`
