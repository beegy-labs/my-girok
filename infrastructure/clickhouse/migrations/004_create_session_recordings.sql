-- ============================================================
-- Session Recordings: rrweb-based Session Replay
-- Retention: 90 days (analytics)
-- Owner: analytics-service / tracking-sdk
-- Kafka Topic: session-recordings
-- ============================================================

-- ============================================================
-- Session Recordings - Stores rrweb event batches
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.session_recordings_local ON CLUSTER 'my_cluster' (
    -- Identity
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3, 'UTC'),
    date Date DEFAULT toDate(timestamp),

    -- Session
    session_id String,
    sequence_start UInt32,
    sequence_end UInt32,

    -- Actor (nullable for anonymous users)
    actor_id Nullable(UUID),
    actor_type LowCardinality(Nullable(String)),  -- USER, OPERATOR, ADMIN
    actor_email LowCardinality(Nullable(String)),

    -- Service Context
    service_slug LowCardinality(String),
    service_version Nullable(String),

    -- Recording Data (compressed rrweb events as JSON array)
    events String,  -- JSON array of rrweb eventWithTime
    events_count UInt32,
    events_compressed Bool DEFAULT false,

    -- Device
    browser LowCardinality(String),
    browser_version String,
    os LowCardinality(String),
    os_version String,
    device_type LowCardinality(String),  -- desktop, mobile, tablet
    screen_resolution String,
    viewport_width UInt16,
    viewport_height UInt16,
    timezone String,
    language LowCardinality(String),
    user_agent String,
    device_fingerprint Nullable(String),

    -- Network
    ip_address String,
    ip_anonymized String,  -- GDPR compliant (last octet zeroed)
    country_code LowCardinality(String),

    -- OTEL Correlation
    trace_id Nullable(String),
    span_id Nullable(String),

    -- Retention
    retention_until Date DEFAULT toDate(timestamp) + INTERVAL 90 DAY
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/analytics/session_recordings',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, session_id, sequence_start)
TTL retention_until
SETTINGS index_granularity = 8192;

-- Distributed table
CREATE TABLE IF NOT EXISTS analytics_db.session_recordings ON CLUSTER 'my_cluster'
AS analytics_db.session_recordings_local
ENGINE = Distributed('my_cluster', 'analytics_db', 'session_recordings_local', xxHash64(session_id));

-- Skip indexes
ALTER TABLE analytics_db.session_recordings_local ON CLUSTER 'my_cluster'
    ADD INDEX IF NOT EXISTS idx_session session_id TYPE bloom_filter GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_actor actor_id TYPE bloom_filter GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_service service_slug TYPE set(50) GRANULARITY 4;


-- ============================================================
-- Session Recording Metadata - Session-level aggregates
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.session_recording_metadata_local ON CLUSTER 'my_cluster' (
    -- Identity
    session_id String,
    date Date DEFAULT today(),

    -- Actor
    actor_id Nullable(UUID),
    actor_type LowCardinality(Nullable(String)),
    actor_email LowCardinality(Nullable(String)),

    -- Service Context
    service_slug LowCardinality(String),

    -- Timing
    started_at DateTime64(3, 'UTC'),
    ended_at Nullable(DateTime64(3, 'UTC')),
    last_event_at DateTime64(3, 'UTC'),
    duration_seconds UInt32 DEFAULT 0,

    -- Recording Stats
    total_events UInt32 DEFAULT 0,
    total_batches UInt16 DEFAULT 0,
    total_bytes UInt64 DEFAULT 0,

    -- Activity Metrics
    page_views UInt16 DEFAULT 0,
    clicks UInt16 DEFAULT 0,
    inputs UInt16 DEFAULT 0,
    scrolls UInt16 DEFAULT 0,
    errors UInt16 DEFAULT 0,

    -- Pages Visited
    entry_page String,
    exit_page String,
    pages_visited Array(String),

    -- Device (from first event)
    browser LowCardinality(String),
    os LowCardinality(String),
    device_type LowCardinality(String),
    screen_resolution String,
    country_code LowCardinality(String),
    device_fingerprint Nullable(String),

    -- Status
    status LowCardinality(String) DEFAULT 'recording',  -- recording, completed, error
    has_errors Bool DEFAULT false,

    -- Retention
    retention_until Date DEFAULT today() + INTERVAL 90 DAY
) ENGINE = ReplicatedReplacingMergeTree(
    '/clickhouse/tables/{shard}/analytics/session_recording_metadata',
    '{replica}',
    last_event_at
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, session_id)
TTL retention_until
SETTINGS index_granularity = 8192;

-- Distributed table
CREATE TABLE IF NOT EXISTS analytics_db.session_recording_metadata ON CLUSTER 'my_cluster'
AS analytics_db.session_recording_metadata_local
ENGINE = Distributed('my_cluster', 'analytics_db', 'session_recording_metadata_local', xxHash64(session_id));


-- ============================================================
-- Kafka Consumer for Session Recordings
-- Topic: session-recordings
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.session_recordings_kafka ON CLUSTER 'my_cluster' (
    id UUID,
    timestamp DateTime64(3, 'UTC'),
    session_id String,
    sequence_start UInt32,
    sequence_end UInt32,
    actor_id Nullable(UUID),
    actor_type Nullable(String),
    actor_email Nullable(String),
    service_slug String,
    service_version Nullable(String),
    events String,
    events_count UInt32,
    events_compressed UInt8,
    browser String,
    browser_version String,
    os String,
    os_version String,
    device_type String,
    screen_resolution String,
    viewport_width UInt16,
    viewport_height UInt16,
    timezone String,
    language String,
    user_agent String,
    device_fingerprint Nullable(String),
    ip_address String,
    ip_anonymized String,
    country_code String,
    trace_id Nullable(String),
    span_id Nullable(String),
    retention_until Date
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'session-recordings',
    kafka_group_name = 'clickhouse-recordings',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_max_block_size = 65536,
    kafka_skip_broken_messages = 10;

-- Materialized View to insert into session_recordings table
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.session_recordings_kafka_mv ON CLUSTER 'my_cluster'
TO analytics_db.session_recordings_local
AS SELECT
    id,
    timestamp,
    toDate(timestamp) as date,
    session_id,
    sequence_start,
    sequence_end,
    actor_id,
    actor_type,
    actor_email,
    service_slug,
    service_version,
    events,
    events_count,
    events_compressed = 1 as events_compressed,
    browser,
    browser_version,
    os,
    os_version,
    device_type,
    screen_resolution,
    viewport_width,
    viewport_height,
    timezone,
    language,
    user_agent,
    device_fingerprint,
    ip_address,
    ip_anonymized,
    country_code,
    trace_id,
    span_id,
    retention_until
FROM analytics_db.session_recordings_kafka;


-- ============================================================
-- Materialized View: Session Recording Daily Stats
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.session_recording_daily_stats_mv ON CLUSTER 'my_cluster'
TO analytics_db.session_recording_daily_stats_local
AS SELECT
    toDate(timestamp) as date,
    service_slug,
    device_type,
    country_code,
    count(DISTINCT session_id) as unique_sessions,
    count() as total_batches,
    sum(events_count) as total_events,
    avg(events_count) as avg_events_per_batch
FROM analytics_db.session_recordings_local
GROUP BY date, service_slug, device_type, country_code;

CREATE TABLE IF NOT EXISTS analytics_db.session_recording_daily_stats_local ON CLUSTER 'my_cluster' (
    date Date,
    service_slug LowCardinality(String),
    device_type LowCardinality(String),
    country_code LowCardinality(String),
    unique_sessions UInt64,
    total_batches UInt64,
    total_events UInt64,
    avg_events_per_batch Float64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/analytics/session_recording_daily_stats',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, service_slug, device_type, country_code)
TTL date + INTERVAL 1 YEAR;

CREATE TABLE IF NOT EXISTS analytics_db.session_recording_daily_stats ON CLUSTER 'my_cluster'
AS analytics_db.session_recording_daily_stats_local
ENGINE = Distributed('my_cluster', 'analytics_db', 'session_recording_daily_stats_local', xxHash64(service_slug));
