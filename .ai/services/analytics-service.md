# Analytics Service

> Business analytics with ClickHouse (90d-1yr retention)

## Tech Stack

| Component | Technology                |
| --------- | ------------------------- |
| Framework | NestJS 11, TypeScript 5.9 |
| Database  | ClickHouse (analytics_db) |
| Port      | 3004                      |

## REST API

### Ingestion

| Method | Path                  | Auth | Description     |
| ------ | --------------------- | ---- | --------------- |
| POST   | `/v1/ingest/session`  | API  | Start session   |
| POST   | `/v1/ingest/event`    | API  | Track event     |
| POST   | `/v1/ingest/pageview` | API  | Track page view |
| POST   | `/v1/ingest/batch`    | API  | Batch ingest    |

### Queries

| Method | Path                   | Auth  | Description      |
| ------ | ---------------------- | ----- | ---------------- |
| GET    | `/v1/sessions`         | Admin | Session list     |
| GET    | `/v1/sessions/stats`   | Admin | Session stats    |
| GET    | `/v1/events`           | Admin | Event list       |
| GET    | `/v1/funnels/:name`    | Admin | Funnel analysis  |
| GET    | `/v1/behavior/summary` | Admin | Behavior summary |

## ClickHouse Schema

```
analytics_db/
├── sessions          # User sessions (1yr TTL)
├── events            # User events (90d TTL)
├── page_views        # Page views (90d TTL)
├── funnel_events     # Funnel tracking (90d TTL)
├── user_profiles     # Aggregated profiles
└── errors            # Error tracking (30d TTL)
```

## Materialized Views

Pre-aggregated data for dashboard queries:

| MV                          | Target Table           | TTL | Purpose                   |
| --------------------------- | ---------------------- | --- | ------------------------- |
| `daily_session_stats_mv`    | daily_session_stats    | 1y  | Daily metrics             |
| `hourly_event_counts_mv`    | hourly_event_counts    | 90d | Event trends              |
| `hourly_session_metrics_mv` | hourly_session_metrics | 30d | Hourly trends             |
| `session_dist_*_mv`         | session_distributions  | 90d | Device/Browser/OS/Country |
| `utm_campaign_stats_mv`     | utm_campaign_stats     | 90d | Campaign attribution      |
| `funnel_stats_mv`           | funnel_stats           | 90d | Funnel conversion         |
| `page_performance_mv`       | page_performance_stats | 90d | Core Web Vitals           |

## Caching (Valkey DB 4)

| Data             | Key Pattern                             | TTL | Invalidation |
| ---------------- | --------------------------------------- | --- | ------------ |
| Behavior Summary | `analytics:behavior:{serviceId}:{date}` | 5m  | MV refresh   |
| Funnel Data      | `analytics:funnel:{funnelId}:{date}`    | 15m | MV refresh   |

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
**MVs**: `infrastructure/clickhouse/schemas/03-materialized_views.sql`
