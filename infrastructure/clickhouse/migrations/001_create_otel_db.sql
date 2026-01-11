-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- otel_db: OpenTelemetry Database
-- Purpose: Distributed tracing, metrics, and logs storage
-- Source: OTEL Collector via Kafka (Redpanda)
-- Owner: platform-monitoring
-- ============================================================

CREATE DATABASE IF NOT EXISTS otel_db;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Traces (Spans)
-- OTLP traces from all services
-- Retention: 30 days
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.traces (
    -- Identity
    trace_id String,
    span_id String,
    parent_span_id String,
    trace_state String,

    -- Timing
    timestamp DateTime64(9, 'UTC'),
    date Date DEFAULT toDate(timestamp),
    duration_ns UInt64,
    start_time_ns UInt64,
    end_time_ns UInt64,

    -- Span Info
    span_name LowCardinality(String),
    span_kind LowCardinality(String),
    status_code LowCardinality(String),
    status_message String,

    -- Service
    service_name LowCardinality(String),
    service_namespace LowCardinality(String),
    service_version String,

    -- Resource Attributes
    cluster LowCardinality(String),
    environment LowCardinality(String),
    k8s_namespace LowCardinality(String),
    k8s_pod_name String,
    k8s_deployment_name LowCardinality(String),
    k8s_node_name LowCardinality(String),

    -- Span Attributes (flattened common ones)
    http_method LowCardinality(Nullable(String)),
    http_url Nullable(String),
    http_status_code Nullable(UInt16),
    http_route Nullable(String),
    db_system LowCardinality(Nullable(String)),
    db_statement Nullable(String),
    rpc_system LowCardinality(Nullable(String)),
    rpc_service Nullable(String),
    rpc_method Nullable(String),

    -- All attributes as JSON
    resource_attributes String DEFAULT '{}',
    span_attributes String DEFAULT '{}',

    -- Events and Links
    events String DEFAULT '[]',
    links String DEFAULT '[]',

    -- Indexes
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_span_kind span_kind TYPE set(10) GRANULARITY 4,
    INDEX idx_status status_code TYPE set(5) GRANULARITY 4,
    INDEX idx_http_status http_status_code TYPE set(100) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(date)
ORDER BY (service_name, date, trace_id, span_id)
TTL date + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Metrics
-- OTLP metrics from all services + Prometheus federation
-- Retention: 90 days
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.metrics (
    -- Identity
    metric_name LowCardinality(String),
    metric_type LowCardinality(String),

    -- Timing
    timestamp DateTime64(9, 'UTC'),
    date Date DEFAULT toDate(timestamp),

    -- Values
    value Float64,
    value_int Nullable(Int64),

    -- Histogram specific
    histogram_count Nullable(UInt64),
    histogram_sum Nullable(Float64),
    histogram_min Nullable(Float64),
    histogram_max Nullable(Float64),
    histogram_buckets String DEFAULT '{}',

    -- Service
    service_name LowCardinality(String),

    -- Resource Attributes
    cluster LowCardinality(String),
    environment LowCardinality(String),
    k8s_namespace LowCardinality(String),
    k8s_pod_name String,
    k8s_deployment_name LowCardinality(String),
    k8s_node_name LowCardinality(String),

    -- All attributes as JSON
    resource_attributes String DEFAULT '{}',
    metric_attributes String DEFAULT '{}',

    -- Indexes
    INDEX idx_metric_name metric_name TYPE bloom_filter GRANULARITY 4,
    INDEX idx_metric_type metric_type TYPE set(10) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(date)
ORDER BY (metric_name, service_name, date, timestamp)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Logs
-- OTLP logs from all services
-- Retention: 30 days
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.logs (
    -- Identity
    timestamp DateTime64(9, 'UTC'),
    date Date DEFAULT toDate(timestamp),
    observed_timestamp DateTime64(9, 'UTC'),

    -- Trace Context
    trace_id Nullable(String),
    span_id Nullable(String),
    trace_flags Nullable(UInt8),

    -- Log Record
    severity_number UInt8,
    severity_text LowCardinality(String),
    body String,

    -- Service
    service_name LowCardinality(String),

    -- Resource Attributes
    cluster LowCardinality(String),
    environment LowCardinality(String),
    k8s_namespace LowCardinality(String),
    k8s_pod_name String,
    k8s_container_name LowCardinality(String),
    k8s_deployment_name LowCardinality(String),
    k8s_node_name LowCardinality(String),

    -- All attributes as JSON
    resource_attributes String DEFAULT '{}',
    log_attributes String DEFAULT '{}',

    -- Indexes
    INDEX idx_severity severity_number TYPE set(20) GRANULARITY 4,
    INDEX idx_trace trace_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_body body TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(date)
ORDER BY (service_name, severity_number, date, timestamp)
TTL date + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS otel_db.logs;
DROP TABLE IF EXISTS otel_db.metrics;
DROP TABLE IF EXISTS otel_db.traces;
DROP DATABASE IF EXISTS otel_db;
-- +goose StatementEnd
