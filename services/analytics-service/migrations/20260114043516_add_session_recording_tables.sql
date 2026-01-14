-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- Session Recordings (Event Logs)
-- Stores individual recording events/batches
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.session_recordings_local (
    id UUID DEFAULT generateUUIDv7(),
    timestamp DateTime64(3),
    date Date,

    -- Session identification
    session_id String,
    sequence_start UInt32,
    sequence_end UInt32,

    -- Actor information
    actor_id Nullable(String),
    actor_type Nullable(String),
    actor_email Nullable(String),

    -- Service context
    service_slug String,
    service_version Nullable(String),

    -- Event data
    events String,  -- JSON array of events
    events_count UInt32,
    events_compressed Bool DEFAULT false,

    -- Device information
    browser LowCardinality(String),
    browser_version String,
    os LowCardinality(String),
    os_version String,
    device_type LowCardinality(String),
    screen_resolution String,
    viewport_width UInt16,
    viewport_height UInt16,
    timezone String,
    language LowCardinality(String),

    -- User agent and device
    user_agent String,
    device_fingerprint Nullable(String),

    -- Network information
    ip_address String,
    ip_anonymized String,
    country_code LowCardinality(String),

    -- Observability
    trace_id Nullable(String),
    span_id Nullable(String),

    -- Retention
    retention_until Date
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (toDate(timestamp), session_id, sequence_start)
TTL retention_until;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS analytics_db.session_recordings AS analytics_db.session_recordings_local
ENGINE = Distributed('default', 'analytics_db', 'session_recordings_local', xxHash64(session_id));
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Session Recording Metadata
-- Aggregated session-level information
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.session_recording_metadata_local (
    session_id String,
    date Date,

    -- Actor information
    actor_id Nullable(String),
    actor_type Nullable(String),
    actor_email Nullable(String),

    -- Service context
    service_slug String,

    -- Timing
    started_at DateTime64(3),
    ended_at Nullable(DateTime64(3)),
    last_event_at DateTime64(3),
    duration_seconds UInt32 DEFAULT 0,

    -- Event statistics
    total_events UInt32 DEFAULT 0,
    total_batches UInt32 DEFAULT 0,
    total_bytes UInt64 DEFAULT 0,

    -- Interaction statistics
    page_views UInt32 DEFAULT 0,
    clicks UInt32 DEFAULT 0,
    inputs UInt32 DEFAULT 0,
    scrolls UInt32 DEFAULT 0,
    errors UInt32 DEFAULT 0,

    -- Page tracking
    entry_page String DEFAULT '',
    exit_page String DEFAULT '',
    pages_visited Array(String) DEFAULT [],

    -- Device information
    browser LowCardinality(String),
    os LowCardinality(String),
    device_type LowCardinality(String),
    screen_resolution String DEFAULT '',
    country_code LowCardinality(String) DEFAULT '',
    device_fingerprint Nullable(String),

    -- Session state
    status LowCardinality(String) DEFAULT 'recording',  -- 'recording', 'completed'
    has_errors Bool DEFAULT false,

    -- Retention
    retention_until Date
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(started_at)
ORDER BY (toDate(started_at), session_id)
TTL retention_until;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS analytics_db.session_recording_metadata AS analytics_db.session_recording_metadata_local
ENGINE = Distributed('default', 'analytics_db', 'session_recording_metadata_local', xxHash64(session_id));
-- +goose StatementEnd


-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS analytics_db.session_recording_metadata;
DROP TABLE IF EXISTS analytics_db.session_recording_metadata_local;
DROP TABLE IF EXISTS analytics_db.session_recordings;
DROP TABLE IF EXISTS analytics_db.session_recordings_local;
-- +goose StatementEnd
