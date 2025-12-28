# Analytics Service

> Business analytics with ClickHouse (90d-1yr retention)

## Quick Reference

| Item      | Value                           |
| --------- | ------------------------------- |
| Port      | 3004                            |
| Framework | NestJS 11 + TypeScript 5.9      |
| Database  | ClickHouse (analytics_db)       |
| Cache     | Valkey (DB 4)                   |
| Retention | 90 days - 1 year (configurable) |

## Purpose

The Analytics Service provides business intelligence and user behavior tracking:

- **Session Tracking**: User sessions with UTM attribution
- **Event Tracking**: Custom events with properties
- **Funnel Analysis**: Multi-step conversion funnels
- **User Profiles**: Aggregated user behavior metrics
- **Error Tracking**: Frontend error monitoring

## API Endpoints

### Ingestion (Write)

| Method | Endpoint              | Auth | Description             |
| ------ | --------------------- | ---- | ----------------------- |
| POST   | `/v1/ingest/session`  | API  | Start new session       |
| POST   | `/v1/ingest/event`    | API  | Track single event      |
| POST   | `/v1/ingest/pageview` | API  | Track page view         |
| POST   | `/v1/ingest/batch`    | API  | Batch ingest (max 1000) |
| POST   | `/v1/ingest/error`    | API  | Track error             |

### Sessions (Read)

| Method | Endpoint                    | Permission       | Description       |
| ------ | --------------------------- | ---------------- | ----------------- |
| GET    | `/v1/sessions`              | `analytics:read` | Session list      |
| GET    | `/v1/sessions/summary`      | `analytics:read` | Session summary   |
| GET    | `/v1/sessions/distribution` | `analytics:read` | Device/OS/Browser |
| GET    | `/v1/sessions/:id/timeline` | `analytics:read` | Session timeline  |

### Behavior

| Method | Endpoint                    | Permission       | Description        |
| ------ | --------------------------- | ---------------- | ------------------ |
| GET    | `/v1/behavior/summary`      | `analytics:read` | Behavior summary   |
| GET    | `/v1/behavior/top-events`   | `analytics:read` | Top events         |
| GET    | `/v1/behavior/by-category`  | `analytics:read` | Events by category |
| GET    | `/v1/behavior/user/:userId` | `analytics:read` | User activity      |

### Funnels

| Method | Endpoint                    | Permission       | Description      |
| ------ | --------------------------- | ---------------- | ---------------- |
| GET    | `/v1/funnels/analyze`       | `analytics:read` | Analyze funnel   |
| GET    | `/v1/funnels/compare`       | `analytics:read` | Compare periods  |
| GET    | `/v1/funnels/dropoff/:step` | `analytics:read` | Dropoff analysis |

**Funnel Query Parameters:**

| Parameter          | Type     | Description                    |
| ------------------ | -------- | ------------------------------ |
| `steps`            | string[] | Event names (e.g., signup,pay) |
| `startDate`        | DateTime | Analysis period start          |
| `endDate`          | DateTime | Analysis period end            |
| `conversionWindow` | number   | Seconds (default: 86400)       |
| `groupBy`          | string   | 'user' or 'session'            |

## ClickHouse Schema

### Database: `analytics_db`

```
analytics_db/
├── sessions          # User sessions (1yr TTL)
├── events            # User events (90d TTL)
├── page_views        # Page views with CWV (90d TTL)
├── funnel_events     # Funnel tracking (90d TTL)
├── user_profiles     # Aggregated profiles (no TTL)
└── errors            # Error tracking (30d TTL)
```

### Tables

#### sessions

| Column           | Type           | Description             |
| ---------------- | -------------- | ----------------------- |
| session_id       | UUID           | UUIDv7 (RFC 9562)       |
| user_id          | UUID (null)    | Logged-in user ID       |
| anonymous_id     | UUID           | Client-generated ID     |
| started_at       | DateTime64(3)  | Session start           |
| ended_at         | DateTime64(3)  | Session end             |
| duration_seconds | UInt32         | Total session duration  |
| is_bounce        | Bool           | Single page session     |
| entry_page       | String         | First page visited      |
| exit_page        | String         | Last page visited       |
| utm\_\*          | String         | UTM attribution fields  |
| device_type      | LowCardinality | desktop, mobile, tablet |
| browser          | LowCardinality | Chrome, Safari, Firefox |
| country_code     | LowCardinality | KR, US, JP, etc.        |
| is_converted     | Bool           | Conversion flag         |

#### events

| Column         | Type           | Description                        |
| -------------- | -------------- | ---------------------------------- |
| id             | UUID           | UUIDv7 (RFC 9562)                  |
| timestamp      | DateTime64(3)  | Event timestamp                    |
| session_id     | UUID           | Parent session                     |
| user_id        | UUID (null)    | User ID if logged in               |
| event_name     | LowCardinality | click, form_submit, purchase       |
| event_category | LowCardinality | navigation, conversion, engagement |
| properties     | String (JSON)  | Custom event properties            |
| page_path      | String         | Page where event occurred          |

#### page_views

| Column               | Type          | Description              |
| -------------------- | ------------- | ------------------------ |
| id                   | UUID          | UUIDv7 (RFC 9562)        |
| timestamp            | DateTime64(3) | View timestamp           |
| session_id           | UUID          | Parent session           |
| page_path            | String        | Page URL path            |
| time_on_page_seconds | UInt32        | Time spent on page       |
| scroll_depth_percent | UInt8         | Max scroll depth (0-100) |
| load_time_ms         | UInt32        | Page load time           |
| ttfb_ms              | UInt32        | Time to First Byte       |
| fcp_ms               | UInt32        | First Contentful Paint   |
| lcp_ms               | UInt32        | Largest Contentful Paint |
| cls                  | Float32       | Cumulative Layout Shift  |

## Materialized Views

Pre-aggregated data for dashboard queries:

| MV Name                     | Target Table           | Engine           | TTL | Purpose                 |
| --------------------------- | ---------------------- | ---------------- | --- | ----------------------- |
| `daily_session_stats_mv`    | daily_session_stats    | SummingMergeTree | 1y  | Daily session metrics   |
| `hourly_event_counts_mv`    | hourly_event_counts    | SummingMergeTree | 90d | Event frequency trends  |
| `hourly_session_metrics_mv` | hourly_session_metrics | SummingMergeTree | 30d | Hourly session trends   |
| `session_dist_device_mv`    | session_distributions  | SummingMergeTree | 90d | Device breakdown        |
| `session_dist_browser_mv`   | session_distributions  | SummingMergeTree | 90d | Browser breakdown       |
| `session_dist_os_mv`        | session_distributions  | SummingMergeTree | 90d | OS breakdown            |
| `session_dist_country_mv`   | session_distributions  | SummingMergeTree | 90d | Country breakdown       |
| `utm_campaign_stats_mv`     | utm_campaign_stats     | SummingMergeTree | 90d | Campaign attribution    |
| `funnel_stats_mv`           | funnel_stats           | SummingMergeTree | 90d | Funnel conversion rates |
| `page_performance_mv`       | page_performance_stats | SummingMergeTree | 90d | Core Web Vitals         |

### Query Examples Using MVs

```sql
-- Session distributions by device (uses MV - fast!)
SELECT dimension_value, session_count, bounce_count
FROM session_distributions
WHERE dimension_type = 'device' AND date >= today() - 7;

-- UTM campaign performance (uses MV)
SELECT utm_source, utm_medium, session_count, conversion_count
FROM utm_campaign_stats WHERE date = today();

-- Daily session trends (uses MV)
SELECT date, session_count, avg_duration, bounce_rate
FROM daily_session_stats
WHERE date >= today() - 30
ORDER BY date;
```

## Caching (Valkey DB 4)

| Data             | Key Pattern                             | TTL | Invalidation |
| ---------------- | --------------------------------------- | --- | ------------ |
| Behavior Summary | `analytics:behavior:{serviceId}:{date}` | 5m  | MV refresh   |
| Funnel Data      | `analytics:funnel:{funnelId}:{date}`    | 15m | MV refresh   |
| Session Summary  | `analytics:session:{serviceId}:{date}`  | 5m  | MV refresh   |

```typescript
import { CacheKey } from '@my-girok/nest-common';

const key = CacheKey.make('analytics', 'behavior', serviceId, date);
// → "dev:analytics:behavior:homeshopping:2025-12-28"
```

## Environment Variables

```bash
# Server
PORT=3004
NODE_ENV=development

# ClickHouse
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=analytics_db
CLICKHOUSE_USERNAME=analytics_user
CLICKHOUSE_PASSWORD=secret
CLICKHOUSE_ASYNC_INSERT=true
CLICKHOUSE_WAIT_FOR_ASYNC_INSERT=false  # High throughput mode

# Valkey Cache
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=
VALKEY_DB=4
```

## Ingestion Best Practices

### Batch Ingestion

```typescript
// Client-side: Buffer events and send in batches
const eventBuffer: TrackEventDto[] = [];

function trackEvent(event: TrackEventDto) {
  eventBuffer.push(event);
  if (eventBuffer.length >= 50) {
    flushEvents();
  }
}

async function flushEvents() {
  if (eventBuffer.length === 0) return;

  await fetch('/v1/ingest/batch', {
    method: 'POST',
    body: JSON.stringify({ events: eventBuffer.splice(0) }),
  });
}

// Flush on page unload
window.addEventListener('beforeunload', flushEvents);
```

### Rate Limits

| Endpoint      | Rate Limit   | Burst |
| ------------- | ------------ | ----- |
| `/ingest/*`   | 1000 req/min | 100   |
| `/sessions`   | 100 req/min  | 20    |
| `/behavior/*` | 100 req/min  | 20    |
| `/funnels/*`  | 50 req/min   | 10    |

## Funnel Analysis

### Creating a Funnel

```typescript
// Define funnel steps as event names
const signupFunnel = {
  steps: ['view_signup', 'start_signup', 'submit_form', 'verify_email', 'complete'],
  conversionWindow: 86400, // 24 hours
  groupBy: 'user',
};

// Analyze
const result = await analyticsService.analyzeFunnel(signupFunnel);
// Returns: { steps: [...], overallConversionRate: 23.5, totalEntered: 1000, totalCompleted: 235 }
```

### Funnel Result Structure

```typescript
interface FunnelResult {
  steps: {
    step: string;
    stepNumber: number;
    entered: number;
    completed: number;
    dropoffRate: number; // % dropped at this step
    conversionRate: number; // % from step 1
    avgTimeToNext: number | null; // seconds
  }[];
  overallConversionRate: number;
  totalEntered: number;
  totalCompleted: number;
  avgTimeToComplete: number | null;
}
```

## Related Documentation

- **LLM Guide**: `.ai/services/analytics-service.md`
- **ClickHouse Schema**: `infrastructure/clickhouse/schemas/02-analytics_db.sql`
- **Materialized Views**: `infrastructure/clickhouse/schemas/03-materialized_views.sql`
- **Caching Policy**: `docs/policies/CACHING.md`
