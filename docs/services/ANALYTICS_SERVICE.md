# Analytics Service

> Business intelligence and analytics service with ClickHouse storage

## Overview

The Analytics Service provides business analytics and metrics tracking for the platform. It processes and stores user behavior data, conversion funnels, and business KPIs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Applications                        │
│  - web-main, web-admin, mobile apps                         │
└─────────────────────────────────────────────────────────────┘
              │ HTTP/OTLP
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Analytics Service (NestJS)                  │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  IngestionController │  │  QueryController     │        │
│  │  - POST /v1/track    │  │  - GET /v1/stats     │        │
│  │  - POST /v1/identify │  │  - GET /v1/funnels   │        │
│  │  - POST /v1/page     │  │  - GET /v1/cohorts   │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  ClickHouse (analytics_db)                   │
│  - user_events         - page_views                         │
│  - user_profiles       - session_summaries                  │
│  - conversion_events   - daily_metrics (MV)                 │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Event Ingestion

| Method | Endpoint       | Description           |
| ------ | -------------- | --------------------- |
| POST   | `/v1/track`    | Track custom events   |
| POST   | `/v1/identify` | Identify/update user  |
| POST   | `/v1/page`     | Track page view       |
| POST   | `/v1/batch`    | Batch event ingestion |

### Query APIs

| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| GET    | `/v1/stats/overview` | Get metrics overview |
| GET    | `/v1/stats/users`    | User metrics         |
| GET    | `/v1/stats/events`   | Event metrics        |
| GET    | `/v1/funnels/:id`    | Funnel analysis      |
| GET    | `/v1/cohorts/:id`    | Cohort analysis      |

### Admin APIs

| Method | Endpoint           | Description                 |
| ------ | ------------------ | --------------------------- |
| GET    | `/v1/admin/events` | Query raw events (admin)    |
| GET    | `/v1/admin/users`  | Query user profiles (admin) |

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

### Page View

```typescript
interface PageViewDto {
  userId?: string;
  anonymousId?: string;
  name?: string;
  properties?: {
    path: string;
    title: string;
    url: string;
    referrer?: string;
  };
}
```

## ClickHouse Tables

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

## Data Retention

| Table         | Retention  | Purpose            |
| ------------- | ---------- | ------------------ |
| user_events   | 2 years    | Event data         |
| page_views    | 2 years    | Page analytics     |
| user_profiles | Indefinite | User data          |
| daily_metrics | 5 years    | Aggregated metrics |

## Rate Limiting

- Track endpoint: 100 req/min per user
- Batch endpoint: 10 req/min, 1000 events/batch
- Query endpoints: 60 req/min per admin

## Development

```bash
# Start service
pnpm --filter analytics-service dev

# Build
pnpm --filter analytics-service build
```

## Environment Variables

```env
# ClickHouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=analytics_db
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100

# JWT
JWT_SECRET=your-secret
```

## Related Documentation

- [.ai/services/analytics-service.md](../../.ai/services/analytics-service.md)
