# Analytics Service

> Business intelligence and analytics with ClickHouse

## Overview

The Analytics Service provides business analytics and metrics tracking. It processes user behavior data, conversion funnels, and business KPIs.

| Property  | Value                      |
| --------- | -------------------------- |
| REST Port | 3004                       |
| Framework | NestJS 11 + TypeScript 5.9 |
| Database  | analytics_db (ClickHouse)  |

## Architecture

```
Client Applications (web-main, web-admin, mobile)
  │ HTTP/OTLP
  ▼
Analytics Service (NestJS)
  ├── IngestionController (POST /v1/track, /v1/identify)
  └── QueryController (GET /v1/stats, /v1/funnels)
          │
          ▼
    ClickHouse (analytics_db)
```

## API Reference

> See `.ai/services/analytics-service.md` for quick endpoint list.

### Event Ingestion API

| Method | Endpoint              | Auth | Description     |
| ------ | --------------------- | ---- | --------------- |
| POST   | `/v1/ingest/session`  | API  | Start session   |
| POST   | `/v1/ingest/event`    | API  | Track event     |
| POST   | `/v1/ingest/pageview` | API  | Track page view |
| POST   | `/v1/ingest/error`    | API  | Track error     |
| POST   | `/v1/ingest/batch`    | API  | Batch ingest    |
| POST   | `/v1/ingest/identify` | API  | Link user       |

### Sessions API

| Method | Endpoint                    | Auth             | Description       |
| ------ | --------------------------- | ---------------- | ----------------- |
| GET    | `/v1/sessions`              | `analytics:read` | Session list      |
| GET    | `/v1/sessions/stats`        | `analytics:read` | Session stats     |
| GET    | `/v1/sessions/summary`      | `analytics:read` | Session summary   |
| GET    | `/v1/sessions/distribution` | `analytics:read` | Device/Browser/OS |
| GET    | `/v1/sessions/:id/timeline` | `analytics:read` | Session timeline  |

### Events API

| Method | Endpoint     | Auth             | Description |
| ------ | ------------ | ---------------- | ----------- |
| GET    | `/v1/events` | `analytics:read` | Event list  |

### Behavior API

| Method | Endpoint                    | Auth             | Description        |
| ------ | --------------------------- | ---------------- | ------------------ |
| GET    | `/v1/behavior/summary`      | `analytics:read` | Behavior summary   |
| GET    | `/v1/behavior/top-events`   | `analytics:read` | Top events         |
| GET    | `/v1/behavior/by-category`  | `analytics:read` | Events by category |
| GET    | `/v1/behavior/user/:userId` | `analytics:read` | User behavior      |

### Funnels API

| Method | Endpoint                    | Auth             | Description      |
| ------ | --------------------------- | ---------------- | ---------------- |
| GET    | `/v1/funnels/:name`         | `analytics:read` | Funnel analysis  |
| GET    | `/v1/funnels/compare`       | `analytics:read` | Compare funnels  |
| GET    | `/v1/funnels/dropoff/:step` | `analytics:read` | Dropoff analysis |

## Event Schema

### Track Event

```typescript
interface TrackEventDto {
  userId?: string;
  anonymousId?: string;
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
  context?: {
    page?: { path: string; title: string; url: string };
    device?: { type: string; os: string; browser: string };
    campaign?: { source: string; medium: string; name: string };
  };
}
```

### Identify Event

```typescript
interface IdentifyDto {
  userId: string;
  traits?: {
    email?: string;
    name?: string;
    plan?: string;
    createdAt?: string;
    [key: string]: unknown;
  };
}
```

## ClickHouse Schema

### user_events

```sql
CREATE TABLE analytics_db.user_events (
    id UUID DEFAULT generateUUIDv7(),
    date Date DEFAULT toDate(timestamp),
    timestamp DateTime64(3),
    user_id Nullable(UUID),
    anonymous_id String,
    session_id String,
    event_name LowCardinality(String),
    event_category LowCardinality(String),
    properties String,  -- JSON
    page_path String,
    page_title String,
    referrer String,
    device_type LowCardinality(String),
    os LowCardinality(String),
    browser LowCardinality(String),
    country LowCardinality(String),
    region String,
    city String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id, event_name, timestamp)
TTL date + INTERVAL 2 YEAR;
```

### user_profiles

```sql
CREATE TABLE analytics_db.user_profiles (
    user_id UUID,
    email Nullable(String),
    name Nullable(String),
    traits String,  -- JSON
    first_seen DateTime64(3),
    last_seen DateTime64(3),
    event_count UInt64,
    session_count UInt32
) ENGINE = ReplacingMergeTree(last_seen)
ORDER BY user_id;
```

## Materialized Views

| MV                        | Target Table           | TTL     | Purpose              |
| ------------------------- | ---------------------- | ------- | -------------------- |
| daily_session_stats_mv    | daily_session_stats    | 1 year  | Daily metrics        |
| hourly_event_counts_mv    | hourly_event_counts    | 90 days | Event trends         |
| hourly_session_metrics_mv | hourly_session_metrics | 30 days | Hourly trends        |
| session*dist*\*\_mv       | session_distributions  | 90 days | Device/Browser/OS    |
| utm_campaign_stats_mv     | utm_campaign_stats     | 90 days | Campaign attribution |
| funnel_stats_mv           | funnel_stats           | 90 days | Funnel conversion    |
| page_performance_mv       | page_performance_stats | 90 days | Core Web Vitals      |

## Data Retention

| Table         | Retention  | Purpose            |
| ------------- | ---------- | ------------------ |
| user_events   | 2 years    | Event data         |
| page_views    | 2 years    | Page analytics     |
| user_profiles | Indefinite | User data          |
| daily_metrics | 5 years    | Aggregated metrics |

## Rate Limiting

| Endpoint | Limit                     | Notes |
| -------- | ------------------------- | ----- |
| Track    | 100/min per user          |       |
| Batch    | 10/min, 1000 events/batch |       |
| Query    | 60/min per admin          |       |

## Development

```bash
# Start service
pnpm --filter analytics-service dev

# Run tests
pnpm --filter analytics-service test
```

## Related Documentation

- [ClickHouse Infrastructure](../infrastructure/CLICKHOUSE.md)
