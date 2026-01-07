# analytics-service

```yaml
port: 3004
db: analytics_db (ClickHouse)
cache: Valkey DB 4
codebase: services/analytics-service/
```

## Boundaries

| Owns                 | Not                |
| -------------------- | ------------------ |
| Session Analytics    | Compliance logging |
| Event Tracking       | User accounts      |
| Funnel Analysis      | Authorization      |
| Campaign Attribution | User data          |

## REST

```
POST /v1/ingest/session|event|pageview|error|batch|identify

GET /v1/sessions[/stats|summary|distribution]
GET /v1/sessions/:id/timeline

GET /v1/events
GET /v1/behavior/summary|top-events|by-category
GET /v1/behavior/user/:userId

GET /v1/funnels/:name|compare
GET /v1/funnels/dropoff/:step
```

## Tables

| Table         | TTL | Purpose          |
| ------------- | --- | ---------------- |
| sessions      | 1y  | User sessions    |
| events        | 90d | User events      |
| page_views    | 90d | Page views       |
| funnel_events | 90d | Funnel tracking  |
| user_profiles | -   | Aggregated users |
| errors        | 30d | Error tracking   |

## MVs

| MV                  | TTL |
| ------------------- | --- |
| daily_session_stats | 1y  |
| hourly_event_counts | 90d |
| utm_campaign_stats  | 90d |
| funnel_stats        | 90d |

## Cache

| Key                                     | TTL |
| --------------------------------------- | --- |
| `analytics:behavior:{serviceId}:{date}` | 5m  |
| `analytics:funnel:{funnelId}:{date}`    | 15m |

## Env

```bash
PORT=3004
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_DATABASE=analytics_db
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false
VALKEY_HOST=localhost
VALKEY_DB=4
```

---

Schema: `infrastructure/clickhouse/schemas/02-analytics_db.sql`
Full: `docs/en/services/ANALYTICS_SERVICE.md`
