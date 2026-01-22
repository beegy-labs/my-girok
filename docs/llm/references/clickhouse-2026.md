# ClickHouse - 2026 Best Practices

> OLAP analytics, query optimization, time-series data | **Researched**: 2026-01-22

## Overview

| Feature     | Description                            |
| ----------- | -------------------------------------- |
| Type        | Column-oriented OLAP database          |
| Performance | Sub-second queries on billions of rows |
| Use Cases   | Analytics, logs, time-series, BI       |
| Compression | 10-20x data compression                |

## Client Setup

### Node.js Client

```typescript
import { createClient, ClickHouseClient } from '@clickhouse/client';

const client: ClickHouseClient = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE || 'default',

  // Connection settings
  request_timeout: 30000,
  max_open_connections: 10,

  // Compression
  compression: {
    request: true,
    response: true,
  },
});

export { client };
```

## Table Design

### Time-Series Events Table

```sql
CREATE TABLE events (
    -- Timestamp as first column for time-based queries
    event_time DateTime64(3),

    -- Event identification
    event_id UUID DEFAULT generateUUIDv4(),
    event_type LowCardinality(String),

    -- User context
    user_id String,
    session_id String,

    -- Event data (JSON for flexibility)
    properties String,  -- JSON string

    -- Dimensions for filtering
    country_code LowCardinality(String),
    device_type LowCardinality(String),
    platform LowCardinality(String),

    -- Date for partitioning
    event_date Date DEFAULT toDate(event_time)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, user_id, event_time)
TTL event_date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
```

### Key Design Decisions

| Decision       | Recommendation              | Reason                 |
| -------------- | --------------------------- | ---------------------- |
| Primary key    | Most filtered columns first | Query performance      |
| Partitioning   | By month (toYYYYMM)         | Data management        |
| LowCardinality | For enum-like strings       | 10x better compression |
| TTL            | Set based on retention      | Automatic cleanup      |

## Query Optimization

### Use PREWHERE for Filtering

```sql
-- ClickHouse optimizes this automatically
SELECT *
FROM events
PREWHERE event_type = 'page_view'
WHERE event_time >= '2024-01-01'
  AND country_code = 'US';

-- PREWHERE reads fewer columns first
-- Then applies WHERE to matching rows
```

### Approximate Functions

```sql
-- ❌ Slow: Exact count distinct
SELECT COUNT(DISTINCT user_id) FROM events;

-- ✅ Fast: Approximate (2% error, 10-100x faster)
SELECT uniq(user_id) FROM events;

-- ✅ Very fast: HyperLogLog (configurable precision)
SELECT uniqHLL12(user_id) FROM events;

-- Approximate quantiles
SELECT quantile(0.95)(response_time) FROM requests;

-- Approximate top N
SELECT topK(10)(page_url) FROM events;
```

### Sampling

```sql
-- Sample 10% of data for quick analysis
SELECT
    event_type,
    count() * 10 AS estimated_count
FROM events
SAMPLE 0.1
GROUP BY event_type;
```

## Inserting Data

### Batch Inserts (Recommended)

```typescript
async function insertEvents(events: Event[]): Promise<void> {
  await client.insert({
    table: 'events',
    values: events,
    format: 'JSONEachRow',
  });
}

// Batch events before inserting
const batch: Event[] = [];
const BATCH_SIZE = 10000;
const FLUSH_INTERVAL = 5000; // 5 seconds

function addEvent(event: Event): void {
  batch.push(event);

  if (batch.length >= BATCH_SIZE) {
    flush();
  }
}

async function flush(): Promise<void> {
  if (batch.length === 0) return;

  const toInsert = [...batch];
  batch.length = 0;

  await insertEvents(toInsert);
}

// Periodic flush
setInterval(flush, FLUSH_INTERVAL);
```

### Async Insert (ClickHouse 22.8+)

```sql
-- Enable async inserts for high-throughput
SET async_insert = 1;
SET wait_for_async_insert = 0;

INSERT INTO events FORMAT JSONEachRow
{"event_time": "2024-01-15 10:00:00", "event_type": "click", ...}
```

## Materialized Views

### Pre-Aggregation

```sql
-- Source table
CREATE TABLE page_views (
    event_time DateTime,
    page_url String,
    user_id String,
    country_code LowCardinality(String)
)
ENGINE = MergeTree()
ORDER BY (event_time, page_url);

-- Materialized view for hourly stats
CREATE MATERIALIZED VIEW page_views_hourly
ENGINE = SummingMergeTree()
ORDER BY (hour, page_url, country_code)
AS SELECT
    toStartOfHour(event_time) AS hour,
    page_url,
    country_code,
    count() AS views,
    uniq(user_id) AS unique_visitors
FROM page_views
GROUP BY hour, page_url, country_code;
```

### Query the View

```sql
-- Fast: Reads pre-aggregated data
SELECT
    hour,
    sum(views) AS total_views,
    sum(unique_visitors) AS total_unique
FROM page_views_hourly
WHERE hour >= '2024-01-01'
GROUP BY hour
ORDER BY hour;
```

## NestJS Integration

### ClickHouse Module

```typescript
// clickhouse/clickhouse.module.ts
import { Module, Global } from '@nestjs/common';
import { createClient, ClickHouseClient } from '@clickhouse/client';

export const CLICKHOUSE_CLIENT = 'CLICKHOUSE_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: CLICKHOUSE_CLIENT,
      useFactory: (): ClickHouseClient => {
        return createClient({
          url: process.env.CLICKHOUSE_URL,
          username: process.env.CLICKHOUSE_USER,
          password: process.env.CLICKHOUSE_PASSWORD,
          database: process.env.CLICKHOUSE_DATABASE,
        });
      },
    },
  ],
  exports: [CLICKHOUSE_CLIENT],
})
export class ClickHouseModule {}
```

### Analytics Service

```typescript
// analytics/analytics.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ClickHouseClient } from '@clickhouse/client';
import { CLICKHOUSE_CLIENT } from '../clickhouse/clickhouse.module';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly client: ClickHouseClient,
  ) {}

  async getPageViews(startDate: Date, endDate: Date): Promise<PageViewStats[]> {
    const query = `
      SELECT
        toDate(event_time) AS date,
        count() AS views,
        uniq(user_id) AS unique_visitors
      FROM events
      WHERE event_type = 'page_view'
        AND event_time >= {startDate:DateTime}
        AND event_time < {endDate:DateTime}
      GROUP BY date
      ORDER BY date
    `;

    const result = await this.client.query({
      query,
      query_params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      format: 'JSONEachRow',
    });

    return result.json<PageViewStats[]>();
  }
}
```

## Performance Guidelines

### Memory Settings

```sql
-- Per-query memory limit
SET max_memory_usage = 10000000000; -- 10GB

-- Server-wide (clickhouse-server/config.xml)
<max_server_memory_usage_to_ram_ratio>0.8</max_server_memory_usage_to_ram_ratio>
```

### Query Complexity

```sql
-- Limit result size
SELECT * FROM events LIMIT 1000;

-- Limit execution time
SET max_execution_time = 30;

-- Limit rows to read
SET max_rows_to_read = 1000000000;
```

## Data Types

| Type                     | Use Case                        |
| ------------------------ | ------------------------------- |
| `DateTime64(3)`          | Timestamps with milliseconds    |
| `LowCardinality(String)` | Enum-like strings (<10K values) |
| `UUID`                   | Unique identifiers              |
| `String`                 | Variable text, JSON             |
| `UInt64/Int64`           | Numeric IDs, counts             |
| `Float64`                | Metrics, percentages            |

## Anti-Patterns

| Don't                 | Do                    | Reason       |
| --------------------- | --------------------- | ------------ |
| Single row inserts    | Batch inserts         | Performance  |
| `SELECT *`            | Select needed columns | Column-store |
| Exact COUNT DISTINCT  | `uniq()` function     | Speed        |
| No partitioning       | Partition by time     | Management   |
| String for enums      | LowCardinality        | Compression  |
| JOINs on large tables | Denormalize           | OLAP design  |

## Sources

- [ClickHouse Query Optimization Guide 2026](https://clickhouse.com/resources/engineering/clickhouse-query-optimisation-definitive-guide)
- [ClickHouse Architecture Overview](https://clickhouse.com/docs/academic_overview)
- [ClickHouse Architecture 101](https://www.chaosgenius.io/blog/clickhouse-architecture/)
- [OLAP Databases 2025](https://www.tinybird.co/blog/best-database-for-olap)
- [ClickHouse Performance Lessons](https://clickhouse.com/blog/what-really-matters-for-performance-lessons-from-a-year-of-benchmarks)
