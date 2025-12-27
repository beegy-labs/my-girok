-- ============================================================
-- Materialized Views for Analytics
-- Pre-aggregated data for faster queries
-- ============================================================

-- ============================================================
-- Daily Session Stats
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.daily_session_stats_mv ON CLUSTER 'my_cluster'
TO analytics_db.daily_session_stats
AS SELECT
    toDate(started_at) as date,
    count() as total_sessions,
    countIf(is_bounce = true) as bounce_sessions,
    countIf(is_converted = true) as converted_sessions,
    countDistinct(user_id) as unique_users,
    avg(duration_seconds) as avg_duration,
    avg(page_view_count) as avg_page_views,
    avg(event_count) as avg_events
FROM analytics_db.sessions_local
GROUP BY date;

CREATE TABLE IF NOT EXISTS analytics_db.daily_session_stats ON CLUSTER 'my_cluster' (
    date Date,
    total_sessions AggregateFunction(count),
    bounce_sessions AggregateFunction(countIf, UInt8),
    converted_sessions AggregateFunction(countIf, UInt8),
    unique_users AggregateFunction(uniq, Nullable(String)),
    avg_duration AggregateFunction(avg, UInt32),
    avg_page_views AggregateFunction(avg, UInt16),
    avg_events AggregateFunction(avg, UInt16)
) ENGINE = ReplicatedAggregatingMergeTree(
    '/clickhouse/tables/{shard}/analytics/daily_session_stats',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY date
TTL date + INTERVAL 1 YEAR;


-- ============================================================
-- Hourly Event Counts
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.hourly_event_counts ON CLUSTER 'my_cluster' (
    hour DateTime,
    event_name LowCardinality(String),
    event_category LowCardinality(String),
    count UInt64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/analytics/hourly_event_counts',
    '{replica}'
)
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, event_name, event_category)
TTL hour + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.hourly_event_counts_mv ON CLUSTER 'my_cluster'
TO analytics_db.hourly_event_counts
AS SELECT
    toStartOfHour(timestamp) as hour,
    event_name,
    event_category,
    count() as count
FROM analytics_db.events_local
GROUP BY hour, event_name, event_category;


-- ============================================================
-- Page Performance Stats
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.page_performance_stats ON CLUSTER 'my_cluster' (
    date Date,
    page_path String,
    views UInt64,
    avg_time_on_page Float32,
    avg_scroll_depth Float32,
    avg_load_time Float32,
    avg_lcp Float32,
    avg_cls Float32
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/analytics/page_performance_stats',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, page_path)
TTL date + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.page_performance_mv ON CLUSTER 'my_cluster'
TO analytics_db.page_performance_stats
AS SELECT
    toDate(timestamp) as date,
    page_path,
    count() as views,
    avg(time_on_page_seconds) as avg_time_on_page,
    avg(scroll_depth_percent) as avg_scroll_depth,
    avg(load_time_ms) as avg_load_time,
    avgIf(lcp_ms, lcp_ms IS NOT NULL) as avg_lcp,
    avgIf(cls, cls IS NOT NULL) as avg_cls
FROM analytics_db.page_views_local
GROUP BY date, page_path;


-- ============================================================
-- Funnel Conversion Stats
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.funnel_stats ON CLUSTER 'my_cluster' (
    date Date,
    funnel_name LowCardinality(String),
    step_number UInt8,
    step_name String,
    entered UInt64,
    completed UInt64,
    dropped UInt64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/analytics/funnel_stats',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, funnel_name, step_number)
TTL date + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.funnel_stats_mv ON CLUSTER 'my_cluster'
TO analytics_db.funnel_stats
AS SELECT
    toDate(timestamp) as date,
    funnel_name,
    step_number,
    step_name,
    count() as entered,
    countIf(is_completed = true) as completed,
    countIf(is_completed = false) as dropped
FROM analytics_db.funnel_events_local
GROUP BY date, funnel_name, step_number, step_name;
