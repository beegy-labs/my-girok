-- ============================================================
-- Materialized Views for Analytics
-- Pre-aggregated data for faster queries
-- ============================================================

-- ============================================================
-- Daily Session Stats (SummingMergeTree for simple counters)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.daily_session_stats ON CLUSTER 'my_cluster' (
    date Date,
    total_sessions UInt64,
    bounce_sessions UInt64,
    converted_sessions UInt64,
    unique_users UInt64,
    total_duration UInt64,
    total_page_views UInt64,
    total_events UInt64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/analytics/daily_session_stats',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY date
TTL date + INTERVAL 1 YEAR;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.daily_session_stats_mv ON CLUSTER 'my_cluster'
TO analytics_db.daily_session_stats
AS SELECT
    toDate(started_at) as date,
    count() as total_sessions,
    countIf(is_bounce = true) as bounce_sessions,
    countIf(is_converted = true) as converted_sessions,
    uniq(user_id) as unique_users,
    sum(duration_seconds) as total_duration,
    sum(page_view_count) as total_page_views,
    sum(event_count) as total_events
FROM analytics_db.sessions_local
GROUP BY date;


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


-- ============================================================
-- Hourly Session Metrics (for time-series dashboards)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.hourly_session_metrics ON CLUSTER 'my_cluster' (
    hour DateTime,
    total_sessions UInt64,
    bounce_sessions UInt64,
    converted_sessions UInt64,
    unique_users UInt64,
    total_duration UInt64,
    total_page_views UInt64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/analytics/hourly_session_metrics',
    '{replica}'
)
PARTITION BY toYYYYMM(hour)
ORDER BY hour
TTL hour + INTERVAL 30 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.hourly_session_metrics_mv ON CLUSTER 'my_cluster'
TO analytics_db.hourly_session_metrics
AS SELECT
    toStartOfHour(started_at) as hour,
    count() as total_sessions,
    countIf(is_bounce = true) as bounce_sessions,
    countIf(is_converted = true) as converted_sessions,
    uniq(user_id) as unique_users,
    sum(duration_seconds) as total_duration,
    sum(page_view_count) as total_page_views
FROM analytics_db.sessions_local
GROUP BY hour;


-- ============================================================
-- Session Distributions (device, browser, OS, country)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.session_distributions ON CLUSTER 'my_cluster' (
    date Date,
    dimension_type LowCardinality(String), -- 'device', 'browser', 'os', 'country'
    dimension_value String,
    session_count UInt64,
    bounce_count UInt64,
    conversion_count UInt64,
    total_duration UInt64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/analytics/session_distributions',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, dimension_type, dimension_value)
TTL date + INTERVAL 90 DAY;

-- Device type distribution
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.session_dist_device_mv ON CLUSTER 'my_cluster'
TO analytics_db.session_distributions
AS SELECT
    toDate(started_at) as date,
    'device' as dimension_type,
    device_type as dimension_value,
    count() as session_count,
    countIf(is_bounce = true) as bounce_count,
    countIf(is_converted = true) as conversion_count,
    sum(duration_seconds) as total_duration
FROM analytics_db.sessions_local
GROUP BY date, device_type;

-- Browser distribution
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.session_dist_browser_mv ON CLUSTER 'my_cluster'
TO analytics_db.session_distributions
AS SELECT
    toDate(started_at) as date,
    'browser' as dimension_type,
    browser as dimension_value,
    count() as session_count,
    countIf(is_bounce = true) as bounce_count,
    countIf(is_converted = true) as conversion_count,
    sum(duration_seconds) as total_duration
FROM analytics_db.sessions_local
GROUP BY date, browser;

-- OS distribution
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.session_dist_os_mv ON CLUSTER 'my_cluster'
TO analytics_db.session_distributions
AS SELECT
    toDate(started_at) as date,
    'os' as dimension_type,
    os as dimension_value,
    count() as session_count,
    countIf(is_bounce = true) as bounce_count,
    countIf(is_converted = true) as conversion_count,
    sum(duration_seconds) as total_duration
FROM analytics_db.sessions_local
GROUP BY date, os;

-- Country distribution
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.session_dist_country_mv ON CLUSTER 'my_cluster'
TO analytics_db.session_distributions
AS SELECT
    toDate(started_at) as date,
    'country' as dimension_type,
    country_code as dimension_value,
    count() as session_count,
    countIf(is_bounce = true) as bounce_count,
    countIf(is_converted = true) as conversion_count,
    sum(duration_seconds) as total_duration
FROM analytics_db.sessions_local
GROUP BY date, country_code;


-- ============================================================
-- UTM Campaign Stats
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.utm_campaign_stats ON CLUSTER 'my_cluster' (
    date Date,
    utm_source LowCardinality(String),
    utm_medium LowCardinality(String),
    utm_campaign LowCardinality(String),
    session_count UInt64,
    bounce_count UInt64,
    conversion_count UInt64,
    unique_users UInt64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/analytics/utm_campaign_stats',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, utm_source, utm_medium, utm_campaign)
TTL date + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.utm_campaign_stats_mv ON CLUSTER 'my_cluster'
TO analytics_db.utm_campaign_stats
AS SELECT
    toDate(started_at) as date,
    coalesce(utm_source, 'direct') as utm_source,
    coalesce(utm_medium, 'none') as utm_medium,
    coalesce(utm_campaign, 'none') as utm_campaign,
    count() as session_count,
    countIf(is_bounce = true) as bounce_count,
    countIf(is_converted = true) as conversion_count,
    uniq(user_id) as unique_users
FROM analytics_db.sessions_local
GROUP BY date, utm_source, utm_medium, utm_campaign;


-- ============================================================
-- Admin Audit Materialized Views (#406)
-- Pre-aggregated data for admin dashboard
-- ============================================================

-- ============================================================
-- Hourly UI Event Aggregates
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_ui_events_hourly ON CLUSTER 'my_cluster' (
    hour DateTime,
    actor_id UUID,
    service_id Nullable(UUID),
    event_type LowCardinality(String),
    event_category LowCardinality(String),
    event_count UInt64,
    unique_sessions UInt64,
    avg_tti_ms Float64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_ui_events_hourly',
    '{replica}'
)
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, actor_id, service_id, event_type, event_category)
TTL hour + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.admin_ui_events_hourly_mv ON CLUSTER 'my_cluster'
TO audit_db.admin_ui_events_hourly
AS SELECT
    toStartOfHour(timestamp) as hour,
    actor_id,
    service_id,
    event_type,
    event_category,
    count() as event_count,
    uniq(session_id) as unique_sessions,
    avg(time_to_interaction_ms) as avg_tti_ms
FROM audit_db.admin_ui_events_local
GROUP BY hour, actor_id, service_id, event_type, event_category;


-- ============================================================
-- Daily Audit Summary
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_audit_daily ON CLUSTER 'my_cluster' (
    date Date,
    service_id UUID,
    resource LowCardinality(String),
    action LowCardinality(String),
    action_count UInt64,
    unique_actors UInt64,
    unique_targets UInt64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_audit_daily',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, service_id, resource, action)
TTL date + INTERVAL 2 YEAR;

CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.admin_audit_daily_mv ON CLUSTER 'my_cluster'
TO audit_db.admin_audit_daily
AS SELECT
    toDate(timestamp) as date,
    service_id,
    resource,
    action,
    count() as action_count,
    uniq(actor_id) as unique_actors,
    uniq(target_id) as unique_targets
FROM audit_db.admin_audit_logs_local
GROUP BY date, service_id, resource, action;


-- ============================================================
-- Error Tracking (30 day retention)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_errors ON CLUSTER 'my_cluster' (
    minute DateTime,
    service_id Nullable(UUID),
    path_template String,
    error_type LowCardinality(Nullable(String)),
    error_count UInt64,
    sample_error Nullable(String)
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_errors',
    '{replica}'
)
PARTITION BY toYYYYMM(minute)
ORDER BY (minute, service_id, path_template, error_type)
TTL minute + INTERVAL 30 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.admin_errors_mv ON CLUSTER 'my_cluster'
TO audit_db.admin_errors
AS SELECT
    toStartOfMinute(timestamp) as minute,
    service_id,
    path_template,
    error_type,
    count() as error_count,
    any(error_message) as sample_error
FROM audit_db.admin_api_logs_local
WHERE status_code >= 400
GROUP BY minute, service_id, path_template, error_type;


-- ============================================================
-- Actor Daily Activity Summary
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_actor_daily ON CLUSTER 'my_cluster' (
    date Date,
    actor_id UUID,
    actor_email LowCardinality(String),
    ui_events UInt64,
    api_calls UInt64,
    data_changes UInt64,
    errors UInt64,
    unique_services UInt64,
    active_minutes UInt64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_actor_daily',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, actor_id)
TTL date + INTERVAL 1 YEAR;

-- MV for UI events
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.admin_actor_daily_ui_mv ON CLUSTER 'my_cluster'
TO audit_db.admin_actor_daily
AS SELECT
    toDate(timestamp) as date,
    actor_id,
    actor_email,
    count() as ui_events,
    0 as api_calls,
    0 as data_changes,
    countIf(event_type = 'error') as errors,
    uniq(service_id) as unique_services,
    uniq(toStartOfMinute(timestamp)) as active_minutes
FROM audit_db.admin_ui_events_local
GROUP BY date, actor_id, actor_email;

-- MV for API calls
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.admin_actor_daily_api_mv ON CLUSTER 'my_cluster'
TO audit_db.admin_actor_daily
AS SELECT
    toDate(timestamp) as date,
    actor_id,
    actor_email,
    0 as ui_events,
    count() as api_calls,
    0 as data_changes,
    countIf(status_code >= 400) as errors,
    uniq(service_id) as unique_services,
    uniq(toStartOfMinute(timestamp)) as active_minutes
FROM audit_db.admin_api_logs_local
GROUP BY date, actor_id, actor_email;

-- MV for data changes
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.admin_actor_daily_audit_mv ON CLUSTER 'my_cluster'
TO audit_db.admin_actor_daily
AS SELECT
    toDate(timestamp) as date,
    actor_id,
    actor_email,
    0 as ui_events,
    0 as api_calls,
    count() as data_changes,
    0 as errors,
    uniq(service_id) as unique_services,
    uniq(toStartOfMinute(timestamp)) as active_minutes
FROM audit_db.admin_audit_logs_local
GROUP BY date, actor_id, actor_email;


-- ============================================================
-- API Performance Hourly Stats
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.admin_api_performance_hourly ON CLUSTER 'my_cluster' (
    hour DateTime,
    path_template String,
    method LowCardinality(String),
    request_count UInt64,
    error_count UInt64,
    total_response_time_ms UInt64,
    max_response_time_ms UInt32,
    p95_response_time_ms Float64,
    p99_response_time_ms Float64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/audit/admin_api_performance_hourly',
    '{replica}'
)
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, path_template, method)
TTL hour + INTERVAL 30 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.admin_api_performance_hourly_mv ON CLUSTER 'my_cluster'
TO audit_db.admin_api_performance_hourly
AS SELECT
    toStartOfHour(timestamp) as hour,
    path_template,
    method,
    count() as request_count,
    countIf(status_code >= 400) as error_count,
    sum(response_time_ms) as total_response_time_ms,
    max(response_time_ms) as max_response_time_ms,
    quantile(0.95)(response_time_ms) as p95_response_time_ms,
    quantile(0.99)(response_time_ms) as p99_response_time_ms
FROM audit_db.admin_api_logs_local
GROUP BY hour, path_template, method;
