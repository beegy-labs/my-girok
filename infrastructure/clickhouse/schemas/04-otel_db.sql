-- ============================================================
-- otel_db: OpenTelemetry Database
-- Purpose: Distributed tracing, metrics, and logs storage
-- Source: OTEL Collector via Kafka (Redpanda)
-- Owner: platform-monitoring
-- ============================================================

-- Database
CREATE DATABASE IF NOT EXISTS otel_db ON CLUSTER 'my_cluster';

-- ============================================================
-- Traces (Spans)
-- OTLP traces from all services
-- Retention: 30 days
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.traces_local ON CLUSTER 'my_cluster' (
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
    span_kind LowCardinality(String),  -- SPAN_KIND_INTERNAL, SPAN_KIND_SERVER, etc.
    status_code LowCardinality(String), -- STATUS_CODE_UNSET, STATUS_CODE_OK, STATUS_CODE_ERROR
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

    -- Events (as JSON array)
    events String DEFAULT '[]',

    -- Links (as JSON array)
    links String DEFAULT '[]'
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/otel/traces',
    '{replica}'
)
PARTITION BY toYYYYMMDD(date)
ORDER BY (service_name, date, trace_id, span_id)
TTL date + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;

-- Distributed table
CREATE TABLE IF NOT EXISTS otel_db.traces ON CLUSTER 'my_cluster'
AS otel_db.traces_local
ENGINE = Distributed('my_cluster', 'otel_db', 'traces_local', xxHash64(trace_id));

-- Skip indexes
ALTER TABLE otel_db.traces_local ON CLUSTER 'my_cluster'
    ADD INDEX IF NOT EXISTS idx_trace_id trace_id TYPE bloom_filter GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_span_kind span_kind TYPE set(10) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_status status_code TYPE set(5) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_http_status http_status_code TYPE set(100) GRANULARITY 4;


-- ============================================================
-- Metrics
-- OTLP metrics from all services + Prometheus federation
-- Retention: 90 days
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.metrics_local ON CLUSTER 'my_cluster' (
    -- Identity
    metric_name LowCardinality(String),
    metric_type LowCardinality(String),  -- gauge, sum, histogram, summary

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
    histogram_buckets String DEFAULT '{}',  -- JSON: {bound: count}

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
    metric_attributes String DEFAULT '{}'
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/otel/metrics',
    '{replica}'
)
PARTITION BY toYYYYMMDD(date)
ORDER BY (metric_name, service_name, date, timestamp)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Distributed table
CREATE TABLE IF NOT EXISTS otel_db.metrics ON CLUSTER 'my_cluster'
AS otel_db.metrics_local
ENGINE = Distributed('my_cluster', 'otel_db', 'metrics_local', xxHash64(metric_name));

-- Skip indexes
ALTER TABLE otel_db.metrics_local ON CLUSTER 'my_cluster'
    ADD INDEX IF NOT EXISTS idx_metric_name metric_name TYPE bloom_filter GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_metric_type metric_type TYPE set(10) GRANULARITY 4;


-- ============================================================
-- Logs
-- OTLP logs from all services
-- Retention: 30 days
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.logs_local ON CLUSTER 'my_cluster' (
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
    log_attributes String DEFAULT '{}'
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/otel/logs',
    '{replica}'
)
PARTITION BY toYYYYMMDD(date)
ORDER BY (service_name, severity_number, date, timestamp)
TTL date + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;

-- Distributed table
CREATE TABLE IF NOT EXISTS otel_db.logs ON CLUSTER 'my_cluster'
AS otel_db.logs_local
ENGINE = Distributed('my_cluster', 'otel_db', 'logs_local', xxHash64(service_name));

-- Skip indexes
ALTER TABLE otel_db.logs_local ON CLUSTER 'my_cluster'
    ADD INDEX IF NOT EXISTS idx_severity severity_number TYPE set(20) GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_trace trace_id TYPE bloom_filter GRANULARITY 4,
    ADD INDEX IF NOT EXISTS idx_body body TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 4;


-- ============================================================
-- Service Dependency Map (Aggregated from traces)
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.service_dependencies ON CLUSTER 'my_cluster' (
    date Date,
    source_service LowCardinality(String),
    target_service LowCardinality(String),
    call_count UInt64,
    error_count UInt64,
    total_duration_ns UInt64,
    p50_duration_ns Float64,
    p95_duration_ns Float64,
    p99_duration_ns Float64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/otel/service_dependencies',
    '{replica}'
)
PARTITION BY toYYYYMM(date)
ORDER BY (date, source_service, target_service)
TTL date + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.service_dependencies_mv ON CLUSTER 'my_cluster'
TO otel_db.service_dependencies
AS SELECT
    toDate(timestamp) as date,
    service_name as source_service,
    -- Extract target from span attributes (http.host, db.name, rpc.service, etc.)
    coalesce(
        JSONExtractString(span_attributes, 'peer.service'),
        JSONExtractString(span_attributes, 'http.host'),
        JSONExtractString(span_attributes, 'db.name'),
        JSONExtractString(span_attributes, 'rpc.service'),
        'unknown'
    ) as target_service,
    count() as call_count,
    countIf(status_code = 'STATUS_CODE_ERROR') as error_count,
    sum(duration_ns) as total_duration_ns,
    quantile(0.5)(duration_ns) as p50_duration_ns,
    quantile(0.95)(duration_ns) as p95_duration_ns,
    quantile(0.99)(duration_ns) as p99_duration_ns
FROM otel_db.traces_local
WHERE span_kind IN ('SPAN_KIND_CLIENT', 'SPAN_KIND_PRODUCER')
GROUP BY date, source_service, target_service;


-- ============================================================
-- Service Error Rates (Aggregated)
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.service_error_rates ON CLUSTER 'my_cluster' (
    hour DateTime,
    service_name LowCardinality(String),
    total_spans UInt64,
    error_spans UInt64,
    error_rate Float64
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/otel/service_error_rates',
    '{replica}'
)
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, service_name)
TTL hour + INTERVAL 30 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.service_error_rates_mv ON CLUSTER 'my_cluster'
TO otel_db.service_error_rates
AS SELECT
    toStartOfHour(timestamp) as hour,
    service_name,
    count() as total_spans,
    countIf(status_code = 'STATUS_CODE_ERROR') as error_spans,
    countIf(status_code = 'STATUS_CODE_ERROR') / count() as error_rate
FROM otel_db.traces_local
WHERE span_kind = 'SPAN_KIND_SERVER'
GROUP BY hour, service_name;


-- ============================================================
-- Log Error Summary
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.log_error_summary ON CLUSTER 'my_cluster' (
    hour DateTime,
    service_name LowCardinality(String),
    severity_text LowCardinality(String),
    log_count UInt64,
    sample_body Nullable(String)
) ENGINE = ReplicatedSummingMergeTree(
    '/clickhouse/tables/{shard}/otel/log_error_summary',
    '{replica}'
)
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, service_name, severity_text)
TTL hour + INTERVAL 7 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.log_error_summary_mv ON CLUSTER 'my_cluster'
TO otel_db.log_error_summary
AS SELECT
    toStartOfHour(timestamp) as hour,
    service_name,
    severity_text,
    count() as log_count,
    any(body) as sample_body
FROM otel_db.logs_local
WHERE severity_number >= 17  -- ERROR and above
GROUP BY hour, service_name, severity_text;
