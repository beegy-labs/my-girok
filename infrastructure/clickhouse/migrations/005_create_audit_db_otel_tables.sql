-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- audit_db: Audit & Compliance Database
-- Purpose: Long-term retention for audit logs, traces, metrics
-- Source: OTEL Collector via Kafka (audit topics)
-- Owner: platform-audit
-- Retention: Logs (7 years), Traces (90 days), Metrics (1 year)
-- ============================================================

CREATE DATABASE IF NOT EXISTS audit_db;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Kafka Queue: Audit Logs
-- Topic: otel.audit.logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.audit_logs_queue (
    timestamp DateTime64(9, 'UTC'),
    observed_timestamp DateTime64(9, 'UTC'),
    trace_id Nullable(String),
    span_id Nullable(String),
    trace_flags Nullable(UInt8),
    severity_number UInt8,
    severity_text String,
    body String,
    service_name String,
    tenant_id String,
    environment String,
    cluster String,
    k8s_namespace String,
    k8s_pod_name String,
    k8s_container_name String,
    k8s_deployment_name String,
    k8s_node_name String,
    log_type String,
    audit_compliance Bool,
    resource_attributes String,
    log_attributes String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel.audit.logs',
    kafka_group_name = 'clickhouse-audit-logs-consumer',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576,
    kafka_skip_broken_messages = 10;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Target Table: Audit Logs (7 year retention)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.otel_audit_logs (
    -- Timing
    timestamp DateTime64(9, 'UTC') CODEC(Delta, ZSTD(1)),
    date Date MATERIALIZED toDate(timestamp),
    observed_timestamp DateTime64(9, 'UTC'),

    -- Trace Context
    trace_id Nullable(FixedString(16)),
    span_id Nullable(FixedString(8)),
    trace_flags Nullable(UInt8),

    -- Log Record
    severity_number UInt8,
    severity_text LowCardinality(String),
    body String,

    -- Service & Tenant
    service_name LowCardinality(String),
    tenant_id LowCardinality(String),
    environment LowCardinality(String),

    -- Kubernetes Context
    cluster LowCardinality(String),
    k8s_namespace LowCardinality(String),
    k8s_pod_name String,
    k8s_container_name LowCardinality(String),
    k8s_deployment_name LowCardinality(String),
    k8s_node_name LowCardinality(String),

    -- Audit Metadata
    log_type LowCardinality(String),
    audit_compliance Bool DEFAULT false,

    -- All attributes as JSON
    resource_attributes String DEFAULT '{}',
    log_attributes String DEFAULT '{}',

    -- Indexes for fast filtering
    INDEX idx_tenant_id tenant_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_log_type log_type TYPE set(0) GRANULARITY 1,
    INDEX idx_body body TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, tenant_id, log_type, timestamp, trace_id)
TTL date + INTERVAL 7 YEAR DELETE
SETTINGS index_granularity = 8192;
-- +goose StatementEnd

-- +goose StatementBegin
-- Materialized View: audit_logs_queue -> otel_audit_logs
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_logs
TO audit_db.otel_audit_logs
AS SELECT
    timestamp,
    toDate(timestamp) as date,
    observed_timestamp,
    if(trace_id != '', unhex(trace_id), NULL) as trace_id,
    if(span_id != '', unhex(span_id), NULL) as span_id,
    trace_flags,
    severity_number,
    severity_text,
    body,
    service_name,
    tenant_id,
    environment,
    cluster,
    k8s_namespace,
    k8s_pod_name,
    k8s_container_name,
    k8s_deployment_name,
    k8s_node_name,
    log_type,
    audit_compliance,
    resource_attributes,
    log_attributes
FROM audit_db.audit_logs_queue;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Kafka Queue: Audit Traces
-- Topic: otel.audit.traces
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.audit_traces_queue (
    trace_id String,
    span_id String,
    parent_span_id String,
    trace_state String,
    timestamp DateTime64(9, 'UTC'),
    duration_ns UInt64,
    start_time_ns UInt64,
    end_time_ns UInt64,
    span_name String,
    span_kind String,
    status_code String,
    status_message String,
    service_name String,
    tenant_id String,
    environment String,
    cluster String,
    k8s_namespace String,
    k8s_pod_name String,
    k8s_deployment_name String,
    k8s_node_name String,
    span_attributes String,
    resource_attributes String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel.audit.traces',
    kafka_group_name = 'clickhouse-audit-traces-consumer',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576,
    kafka_skip_broken_messages = 10;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Target Table: Audit Traces (90 day retention)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.otel_audit_traces (
    -- Identity
    trace_id FixedString(16),
    span_id FixedString(8),
    parent_span_id FixedString(8),

    -- Timing
    timestamp DateTime64(9, 'UTC') CODEC(Delta, ZSTD(1)),
    date Date MATERIALIZED toDate(timestamp),
    duration_ns UInt64,

    -- Span Info
    span_name String,
    span_kind LowCardinality(String),
    status_code LowCardinality(String),

    -- Service & Tenant
    service_name LowCardinality(String),
    tenant_id LowCardinality(String),
    environment LowCardinality(String),

    -- Kubernetes Context
    cluster LowCardinality(String),
    k8s_namespace LowCardinality(String),
    k8s_pod_name String,
    k8s_deployment_name LowCardinality(String),
    k8s_node_name LowCardinality(String),

    -- Attributes
    span_attributes String DEFAULT '{}',
    resource_attributes String DEFAULT '{}',

    -- Indexes
    INDEX idx_tenant_id tenant_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, tenant_id, timestamp, trace_id, span_id)
TTL date + INTERVAL 90 DAY DELETE
SETTINGS index_granularity = 8192;
-- +goose StatementEnd

-- +goose StatementBegin
-- Materialized View: audit_traces_queue -> otel_audit_traces
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_traces
TO audit_db.otel_audit_traces
AS SELECT
    unhex(trace_id) as trace_id,
    unhex(span_id) as span_id,
    unhex(parent_span_id) as parent_span_id,
    timestamp,
    toDate(timestamp) as date,
    duration_ns,
    span_name,
    span_kind,
    status_code,
    service_name,
    tenant_id,
    environment,
    cluster,
    k8s_namespace,
    k8s_pod_name,
    k8s_deployment_name,
    k8s_node_name,
    span_attributes,
    resource_attributes
FROM audit_db.audit_traces_queue;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Kafka Queue: Audit Metrics
-- Topic: otel.audit.metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.audit_metrics_queue (
    metric_name String,
    metric_type String,
    timestamp DateTime64(9, 'UTC'),
    value Float64,
    service_name String,
    tenant_id String,
    environment String,
    cluster String,
    k8s_namespace String,
    k8s_pod_name String,
    k8s_deployment_name String,
    k8s_node_name String,
    metric_attributes String,
    resource_attributes String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel.audit.metrics',
    kafka_group_name = 'clickhouse-audit-metrics-consumer',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576,
    kafka_skip_broken_messages = 10;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Target Table: Audit Metrics (1 year retention)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.otel_audit_metrics (
    -- Timing
    timestamp DateTime64(9, 'UTC') CODEC(Delta, ZSTD(1)),
    date Date MATERIALIZED toDate(timestamp),

    -- Metric Identity
    metric_name LowCardinality(String),
    metric_type LowCardinality(String),
    value Float64,

    -- Service & Tenant
    service_name LowCardinality(String),
    tenant_id LowCardinality(String),
    environment LowCardinality(String),

    -- Kubernetes Context
    cluster LowCardinality(String),
    k8s_namespace LowCardinality(String),
    k8s_pod_name String,
    k8s_deployment_name LowCardinality(String),
    k8s_node_name LowCardinality(String),

    -- Attributes
    metric_attributes String DEFAULT '{}',
    resource_attributes String DEFAULT '{}',

    -- Indexes
    INDEX idx_tenant_id tenant_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_metric_name metric_name TYPE bloom_filter GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, tenant_id, metric_name, timestamp)
TTL date + INTERVAL 1 YEAR DELETE
SETTINGS index_granularity = 8192;
-- +goose StatementEnd

-- +goose StatementBegin
-- Materialized View: audit_metrics_queue -> otel_audit_metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_metrics
TO audit_db.otel_audit_metrics
AS SELECT
    timestamp,
    toDate(timestamp) as date,
    metric_name,
    metric_type,
    value,
    service_name,
    tenant_id,
    environment,
    cluster,
    k8s_namespace,
    k8s_pod_name,
    k8s_deployment_name,
    k8s_node_name,
    metric_attributes,
    resource_attributes
FROM audit_db.audit_metrics_queue;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP VIEW IF EXISTS audit_db.mv_audit_metrics;
DROP VIEW IF EXISTS audit_db.mv_audit_traces;
DROP VIEW IF EXISTS audit_db.mv_audit_logs;

DROP TABLE IF EXISTS audit_db.otel_audit_metrics;
DROP TABLE IF EXISTS audit_db.otel_audit_traces;
DROP TABLE IF EXISTS audit_db.otel_audit_logs;

DROP TABLE IF EXISTS audit_db.audit_metrics_queue;
DROP TABLE IF EXISTS audit_db.audit_traces_queue;
DROP TABLE IF EXISTS audit_db.audit_logs_queue;

DROP DATABASE IF EXISTS audit_db;
-- +goose StatementEnd
