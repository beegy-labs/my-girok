-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- Add SASL Authentication to Kafka Engine Tables
-- Purpose: Enable Redpanda SASL SCRAM-SHA-512 authentication
-- Reason: Kafka Engine tables cannot consume without auth
-- ============================================================

-- Drop Materialized Views first (they depend on Kafka Engine tables)
DROP VIEW IF EXISTS audit_db.mv_audit_logs;
-- +goose StatementEnd

-- +goose StatementBegin
DROP VIEW IF EXISTS audit_db.mv_audit_traces;
-- +goose StatementEnd

-- +goose StatementBegin
DROP VIEW IF EXISTS audit_db.mv_audit_metrics;
-- +goose StatementEnd

-- +goose StatementBegin
-- Drop existing Kafka Engine tables (no data loss - they're just queues)
DROP TABLE IF EXISTS audit_db.audit_logs_queue;
-- +goose StatementEnd

-- +goose StatementBegin
DROP TABLE IF EXISTS audit_db.audit_traces_queue;
-- +goose StatementEnd

-- +goose StatementBegin
DROP TABLE IF EXISTS audit_db.audit_metrics_queue;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Recreate Kafka Queue: Audit Logs (with SASL)
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
    kafka_skip_broken_messages = 10,
    kafka_sasl_mechanism = 'SCRAM-SHA-512',
    kafka_sasl_username = 'superuser',
    kafka_sasl_password = 'RedpandaSASL2024';
-- +goose StatementEnd

-- +goose StatementBegin
-- Recreate Materialized View: audit_logs_queue -> otel_audit_logs
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_logs
TO audit_db.otel_audit_logs
AS SELECT
    timestamp,
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
-- Recreate Kafka Queue: Audit Traces (with SASL)
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
    kafka_skip_broken_messages = 10,
    kafka_sasl_mechanism = 'SCRAM-SHA-512',
    kafka_sasl_username = 'superuser',
    kafka_sasl_password = 'RedpandaSASL2024';
-- +goose StatementEnd

-- +goose StatementBegin
-- Recreate Materialized View: audit_traces_queue -> otel_audit_traces
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_traces
TO audit_db.otel_audit_traces
AS SELECT
    unhex(trace_id) as trace_id,
    unhex(span_id) as span_id,
    unhex(parent_span_id) as parent_span_id,
    timestamp,
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
-- Recreate Kafka Queue: Audit Metrics (with SASL)
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
    kafka_skip_broken_messages = 10,
    kafka_sasl_mechanism = 'SCRAM-SHA-512',
    kafka_sasl_username = 'superuser',
    kafka_sasl_password = 'RedpandaSASL2024';
-- +goose StatementEnd

-- +goose StatementBegin
-- Recreate Materialized View: audit_metrics_queue -> otel_audit_metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_metrics
TO audit_db.otel_audit_metrics
AS SELECT
    timestamp,
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
-- Rollback: Remove SASL-enabled tables and recreate without SASL
DROP VIEW IF EXISTS audit_db.mv_audit_metrics;
DROP VIEW IF EXISTS audit_db.mv_audit_traces;
DROP VIEW IF EXISTS audit_db.mv_audit_logs;

DROP TABLE IF EXISTS audit_db.audit_metrics_queue;
DROP TABLE IF EXISTS audit_db.audit_traces_queue;
DROP TABLE IF EXISTS audit_db.audit_logs_queue;

-- Recreate without SASL (refer to migration 005 for original schema)
-- +goose StatementEnd
