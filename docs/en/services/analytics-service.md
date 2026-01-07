# Analytics Service

> Business intelligence and analytics with ClickHouse

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

| This Service Owns    | NOT This Service (Other Services)  |
| -------------------- | ---------------------------------- |
| Session Analytics    | Compliance logging (audit-service) |
| Event Tracking       | User accounts (identity-service)   |
| Funnel Analysis      | Authorization (auth-service)       |
| Campaign Attribution | User data (personal-service)       |

## REST API

### Ingest

| Method | Endpoint              | Description              |
| ------ | --------------------- | ------------------------ |
| POST   | `/v1/ingest/session`  | Ingest session start/end |
| POST   | `/v1/ingest/event`    | Ingest single event      |
| POST   | `/v1/ingest/pageview` | Ingest page view         |
| POST   | `/v1/ingest/error`    | Ingest error event       |
| POST   | `/v1/ingest/batch`    | Ingest batch events      |
| POST   | `/v1/ingest/identify` | Identify user            |

### Sessions

| Method | Endpoint                    | Description          |
| ------ | --------------------------- | -------------------- |
| GET    | `/v1/sessions`              | List sessions        |
| GET    | `/v1/sessions/stats`        | Session statistics   |
| GET    | `/v1/sessions/summary`      | Session summary      |
| GET    | `/v1/sessions/distribution` | Session distribution |
| GET    | `/v1/sessions/:id/timeline` | Session timeline     |

### Events & Behavior

| Method | Endpoint                    | Description        |
| ------ | --------------------------- | ------------------ |
| GET    | `/v1/events`                | List events        |
| GET    | `/v1/behavior/summary`      | Behavior summary   |
| GET    | `/v1/behavior/top-events`   | Top events         |
| GET    | `/v1/behavior/by-category`  | Events by category |
| GET    | `/v1/behavior/user/:userId` | User behavior      |

### Funnels

| Method | Endpoint                    | Description      |
| ------ | --------------------------- | ---------------- |
| GET    | `/v1/funnels/:name`         | Get funnel data  |
| GET    | `/v1/funnels/compare`       | Compare funnels  |
| GET    | `/v1/funnels/dropoff/:step` | Dropoff analysis |

## Database Tables (ClickHouse)

| Table         | TTL | Purpose                  |
| ------------- | --- | ------------------------ |
| sessions      | 1y  | User session data        |
| events        | 90d | User interaction events  |
| page_views    | 90d | Page view tracking       |
| funnel_events | 90d | Funnel step tracking     |
| user_profiles | -   | Aggregated user profiles |
| errors        | 30d | Error tracking           |

## Materialized Views

| MV                  | TTL | Purpose                  |
| ------------------- | --- | ------------------------ |
| daily_session_stats | 1y  | Daily session aggregates |
| hourly_event_counts | 90d | Hourly event counts      |
| utm_campaign_stats  | 90d | Campaign performance     |
| funnel_stats        | 90d | Funnel conversion rates  |

## Cache Keys (Valkey)

| Key Pattern                             | TTL   | Description         |
| --------------------------------------- | ----- | ------------------- |
| `analytics:behavior:{serviceId}:{date}` | 5min  | Behavior data cache |
| `analytics:funnel:{funnelId}:{date}`    | 15min | Funnel data cache   |

## Environment Variables

```bash
# REST API port
PORT=3004

# ClickHouse configuration
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=analytics_db
CLICKHOUSE_USERNAME=analytics_user
CLICKHOUSE_PASSWORD=
CLICKHOUSE_ASYNC_INSERT=true
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false

# Valkey cache
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_DB=4

# Rate limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

---

**Schema**: `infrastructure/clickhouse/schemas/02-analytics_db.sql`
**LLM Reference**: `docs/llm/services/analytics-service.md`
