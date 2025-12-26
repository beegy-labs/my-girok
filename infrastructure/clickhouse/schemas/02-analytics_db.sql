-- ============================================================
-- analytics_db: Business Analytics Database
-- Retention: 90 days ~ 1 year (configurable)
-- Owner: analytics-service
-- ============================================================

-- Database
CREATE DATABASE IF NOT EXISTS analytics_db ON CLUSTER 'my_cluster';

-- ============================================================
-- Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.sessions_local ON CLUSTER 'my_cluster' (
    session_id UUID DEFAULT generateUUIDv7(), -- UUIDv7 (RFC 9562)
    user_id Nullable(UUID),             -- UUIDv7 (null for anonymous)
    anonymous_id UUID,                  -- UUIDv7 (generated client-side)

    started_at DateTime64(3),
    ended_at Nullable(DateTime64(3)),
    duration_seconds UInt32 DEFAULT 0,
    is_bounce Bool DEFAULT false,

    entry_page String,
    exit_page String,
    referrer String,

    utm_source Nullable(String),
    utm_medium Nullable(String),
    utm_campaign Nullable(String),
    utm_term Nullable(String),
    utm_content Nullable(String),

    page_view_count UInt16 DEFAULT 0,
    event_count UInt16 DEFAULT 0,

    device_type LowCardinality(String), -- 'desktop', 'mobile', 'tablet'
    browser LowCardinality(String),
    browser_version String,
    os LowCardinality(String),
    os_version String,
    country_code LowCardinality(String),
    region Nullable(String),
    city Nullable(String),

    is_converted Bool DEFAULT false,
    conversion_event Nullable(String),
    conversion_value Nullable(Decimal(10,2))
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/analytics/sessions',
    '{replica}'
)
PARTITION BY toYYYYMM(started_at)
ORDER BY (toDate(started_at), session_id)
TTL started_at + INTERVAL 1 YEAR;

CREATE TABLE IF NOT EXISTS analytics_db.sessions ON CLUSTER 'my_cluster' AS analytics_db.sessions_local
ENGINE = Distributed('my_cluster', 'analytics_db', 'sessions_local', xxHash64(toString(session_id)));


-- ============================================================
-- Events
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.events_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),   -- UUIDv7 (RFC 9562)
    timestamp DateTime64(3),
    session_id UUID,                     -- UUIDv7
    user_id Nullable(UUID),              -- UUIDv7

    event_name LowCardinality(String),  -- 'click', 'form_submit', 'purchase', etc.
    event_category LowCardinality(String), -- 'navigation', 'conversion', 'engagement'
    properties String,                  -- JSON

    page_path String,
    page_title String,
    element_id Nullable(String),
    element_class Nullable(String),
    element_text Nullable(String)
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/analytics/events',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (session_id, timestamp)
TTL timestamp + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS analytics_db.events ON CLUSTER 'my_cluster' AS analytics_db.events_local
ENGINE = Distributed('my_cluster', 'analytics_db', 'events_local', xxHash64(toString(session_id)));


-- ============================================================
-- Page Views
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.page_views_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),   -- UUIDv7 (RFC 9562)
    timestamp DateTime64(3),
    session_id UUID,                     -- UUIDv7
    user_id Nullable(UUID),              -- UUIDv7

    page_path String,
    page_title String,
    referrer_path Nullable(String),

    time_on_page_seconds UInt32 DEFAULT 0,
    scroll_depth_percent UInt8 DEFAULT 0,
    load_time_ms UInt32,

    -- Performance metrics
    ttfb_ms Nullable(UInt32),           -- Time to First Byte
    fcp_ms Nullable(UInt32),            -- First Contentful Paint
    lcp_ms Nullable(UInt32),            -- Largest Contentful Paint
    cls Nullable(Float32)               -- Cumulative Layout Shift
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/analytics/page_views',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (session_id, timestamp)
TTL timestamp + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS analytics_db.page_views ON CLUSTER 'my_cluster' AS analytics_db.page_views_local
ENGINE = Distributed('my_cluster', 'analytics_db', 'page_views_local', xxHash64(toString(session_id)));


-- ============================================================
-- Funnel Events
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.funnel_events_local ON CLUSTER 'my_cluster' (
    timestamp DateTime64(3),
    session_id UUID,                     -- UUIDv7
    user_id Nullable(UUID),              -- UUIDv7

    funnel_name LowCardinality(String), -- 'signup', 'checkout', 'onboarding'
    step_number UInt8,
    step_name String,

    is_completed Bool DEFAULT false,
    dropped_at Nullable(String),        -- Where user dropped off
    time_in_step_seconds Nullable(UInt32)
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/analytics/funnel_events',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (funnel_name, session_id, step_number)
TTL timestamp + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS analytics_db.funnel_events ON CLUSTER 'my_cluster' AS analytics_db.funnel_events_local
ENGINE = Distributed('my_cluster', 'analytics_db', 'funnel_events_local', xxHash64(toString(session_id)));


-- ============================================================
-- User Profiles (Aggregated)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.user_profiles_local ON CLUSTER 'my_cluster' (
    user_id UUID,                        -- UUIDv7
    updated_at DateTime64(3),

    first_seen_at DateTime64(3),
    last_seen_at DateTime64(3),
    total_sessions UInt32 DEFAULT 0,
    total_events UInt32 DEFAULT 0,
    total_page_views UInt32 DEFAULT 0,

    -- Engagement metrics
    avg_session_duration_seconds Float32 DEFAULT 0,
    avg_pages_per_session Float32 DEFAULT 0,

    -- ML-ready fields
    persona Nullable(String),           -- ML-assigned persona
    lifetime_value Decimal(10,2) DEFAULT 0,
    churn_risk_score Float32 DEFAULT 0,
    engagement_score Float32 DEFAULT 0,

    -- Attribution
    first_utm_source Nullable(String),
    first_utm_medium Nullable(String),
    first_utm_campaign Nullable(String),
    last_utm_source Nullable(String),
    last_utm_medium Nullable(String),
    last_utm_campaign Nullable(String),

    properties String                   -- JSON for custom properties
) ENGINE = ReplicatedReplacingMergeTree(
    '/clickhouse/tables/{shard}/analytics/user_profiles',
    '{replica}',
    updated_at
)
ORDER BY user_id;

CREATE TABLE IF NOT EXISTS analytics_db.user_profiles ON CLUSTER 'my_cluster' AS analytics_db.user_profiles_local
ENGINE = Distributed('my_cluster', 'analytics_db', 'user_profiles_local', xxHash64(toString(user_id)));


-- ============================================================
-- Error Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.errors_local ON CLUSTER 'my_cluster' (
    id UUID DEFAULT generateUUIDv7(),   -- UUIDv7 (RFC 9562)
    timestamp DateTime64(3),
    session_id UUID,                     -- UUIDv7
    user_id Nullable(UUID),              -- UUIDv7

    error_type LowCardinality(String),  -- 'javascript', 'network', 'api'
    error_message String,
    error_stack Nullable(String),

    page_path String,
    browser LowCardinality(String),
    os LowCardinality(String),

    metadata String                     -- JSON
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/analytics/errors',
    '{replica}'
)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (error_type, timestamp)
TTL timestamp + INTERVAL 30 DAY;

CREATE TABLE IF NOT EXISTS analytics_db.errors ON CLUSTER 'my_cluster' AS analytics_db.errors_local
ENGINE = Distributed('my_cluster', 'analytics_db', 'errors_local', xxHash64(toString(session_id)));
