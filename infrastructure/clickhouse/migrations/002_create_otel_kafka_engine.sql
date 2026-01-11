-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- Kafka Engine Tables for OTEL Pipeline
-- Source: Redpanda (kafka.girok.dev:9093)
-- Architecture: Services -> OTEL Collector -> Kafka -> ClickHouse
-- ============================================================

-- ============================================================
-- Traces Kafka Consumer
-- Topic: otel-traces
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.traces_kafka (
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
    service_namespace String,
    service_version String,
    cluster String,
    environment String,
    k8s_namespace String,
    k8s_pod_name String,
    k8s_deployment_name String,
    k8s_node_name String,
    http_method Nullable(String),
    http_url Nullable(String),
    http_status_code Nullable(UInt16),
    http_route Nullable(String),
    db_system Nullable(String),
    db_statement Nullable(String),
    rpc_system Nullable(String),
    rpc_service Nullable(String),
    rpc_method Nullable(String),
    resource_attributes String,
    span_attributes String,
    events String,
    links String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel-traces',
    kafka_group_name = 'clickhouse-traces',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_max_block_size = 65536,
    kafka_skip_broken_messages = 10;
-- +goose StatementEnd

-- +goose StatementBegin
-- Materialized View: traces_kafka -> traces
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.traces_kafka_mv
TO otel_db.traces
AS SELECT
    trace_id,
    span_id,
    parent_span_id,
    trace_state,
    timestamp,
    toDate(timestamp) as date,
    duration_ns,
    start_time_ns,
    end_time_ns,
    span_name,
    span_kind,
    status_code,
    status_message,
    service_name,
    service_namespace,
    service_version,
    cluster,
    environment,
    k8s_namespace,
    k8s_pod_name,
    k8s_deployment_name,
    k8s_node_name,
    http_method,
    http_url,
    http_status_code,
    http_route,
    db_system,
    db_statement,
    rpc_system,
    rpc_service,
    rpc_method,
    resource_attributes,
    span_attributes,
    events,
    links
FROM otel_db.traces_kafka;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Metrics Kafka Consumer
-- Topic: otel-metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.metrics_kafka (
    metric_name String,
    metric_type String,
    timestamp DateTime64(9, 'UTC'),
    value Float64,
    value_int Nullable(Int64),
    histogram_count Nullable(UInt64),
    histogram_sum Nullable(Float64),
    histogram_min Nullable(Float64),
    histogram_max Nullable(Float64),
    histogram_buckets String,
    service_name String,
    cluster String,
    environment String,
    k8s_namespace String,
    k8s_pod_name String,
    k8s_deployment_name String,
    k8s_node_name String,
    resource_attributes String,
    metric_attributes String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel-metrics',
    kafka_group_name = 'clickhouse-metrics',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_max_block_size = 65536,
    kafka_skip_broken_messages = 10;
-- +goose StatementEnd

-- +goose StatementBegin
-- Materialized View: metrics_kafka -> metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.metrics_kafka_mv
TO otel_db.metrics
AS SELECT
    metric_name,
    metric_type,
    timestamp,
    toDate(timestamp) as date,
    value,
    value_int,
    histogram_count,
    histogram_sum,
    histogram_min,
    histogram_max,
    histogram_buckets,
    service_name,
    cluster,
    environment,
    k8s_namespace,
    k8s_pod_name,
    k8s_deployment_name,
    k8s_node_name,
    resource_attributes,
    metric_attributes
FROM otel_db.metrics_kafka;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Logs Kafka Consumer
-- Topic: otel-logs
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.logs_kafka (
    timestamp DateTime64(9, 'UTC'),
    observed_timestamp DateTime64(9, 'UTC'),
    trace_id Nullable(String),
    span_id Nullable(String),
    trace_flags Nullable(UInt8),
    severity_number UInt8,
    severity_text String,
    body String,
    service_name String,
    cluster String,
    environment String,
    k8s_namespace String,
    k8s_pod_name String,
    k8s_container_name String,
    k8s_deployment_name String,
    k8s_node_name String,
    resource_attributes String,
    log_attributes String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel-logs',
    kafka_group_name = 'clickhouse-logs',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_max_block_size = 65536,
    kafka_skip_broken_messages = 10;
-- +goose StatementEnd

-- +goose StatementBegin
-- Materialized View: logs_kafka -> logs
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.logs_kafka_mv
TO otel_db.logs
AS SELECT
    timestamp,
    toDate(timestamp) as date,
    observed_timestamp,
    trace_id,
    span_id,
    trace_flags,
    severity_number,
    severity_text,
    body,
    service_name,
    cluster,
    environment,
    k8s_namespace,
    k8s_pod_name,
    k8s_container_name,
    k8s_deployment_name,
    k8s_node_name,
    resource_attributes,
    log_attributes
FROM otel_db.logs_kafka;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP VIEW IF EXISTS otel_db.logs_kafka_mv;
DROP TABLE IF EXISTS otel_db.logs_kafka;
DROP VIEW IF EXISTS otel_db.metrics_kafka_mv;
DROP TABLE IF EXISTS otel_db.metrics_kafka;
DROP VIEW IF EXISTS otel_db.traces_kafka_mv;
DROP TABLE IF EXISTS otel_db.traces_kafka;
-- +goose StatementEnd
