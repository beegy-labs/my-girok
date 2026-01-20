-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- Migration 007: OTLP JSON Parsing with JSONAsString
-- Purpose: Fix format mismatch between OTLP JSON and ClickHouse schema
-- Problem: OTEL Collector sends OTLP JSON (nested), but Kafka Engine expects flat JSON
-- Solution: Use JSONAsString format + simplified JSONExtract
-- References:
--   - https://clickhouse.com/resources/engineering/best-resources-storing-opentelemetry-collector-data
--   - https://kb.altinity.com/altinity-kb-schema-design/altinity-kb-jsonasstring-and-mat.-view-as-json-parser/
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
-- Recreate Kafka Queue: Audit Logs (JSONAsString format)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.audit_logs_queue (
    raw String  -- Entire OTLP JSON message as string
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9094',
    kafka_topic_list = 'otel.audit.logs',
    kafka_group_name = 'clickhouse-audit-logs-consumer',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576,
    kafka_skip_broken_messages = 10,
    kafka_security_protocol = 'SASL_PLAINTEXT',
    kafka_sasl_mechanism = 'SCRAM-SHA-512',
    kafka_sasl_username = 'superuser',
    kafka_sasl_password = 'RedpandaSASL2024';
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Recreate Materialized View: Parse OTLP JSON Logs
-- OTLP Structure: resourceLogs[0].scopeLogs[0].logRecords[0]
-- Simplified: Store attributes as JSON, extract service_name via tryJSONExtract
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_logs
TO audit_db.otel_audit_logs
AS SELECT
    -- Timing
    toDateTime64(
        toUInt64(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'timeUnixNano')) / 1000000000,
        9,
        'UTC'
    ) as timestamp,

    toDateTime64(
        toUInt64(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'observedTimeUnixNano')) / 1000000000,
        9,
        'UTC'
    ) as observed_timestamp,

    -- Trace Context
    if(
        JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'traceId') != '',
        toFixedString(unhex(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'traceId')), 16),
        NULL
    ) as trace_id,

    if(
        JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'spanId') != '',
        toFixedString(unhex(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'spanId')), 8),
        NULL
    ) as span_id,

    toUInt8OrNull(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'flags')) as trace_flags,

    -- Severity
    toUInt8(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'severityNumber')) as severity_number,
    JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'severityText') as severity_text,

    -- Body
    JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'body', 'stringValue') as body,

    -- Service name (fallback: extract from first attribute or use 'unknown-service')
    coalesce(
        JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 1, 'value', 'stringValue'),
        'unknown-service'
    ) as service_name,

    -- Tenant ID (fallback: 'system')
    coalesce(
        JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 2, 'value', 'stringValue'),
        'system'
    ) as tenant_id,

    -- Environment (fallback: 'development')
    coalesce(
        JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 3, 'value', 'stringValue'),
        'development'
    ) as environment,

    -- Kubernetes context (may be empty)
    JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 4, 'value', 'stringValue') as cluster,
    JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 5, 'value', 'stringValue') as k8s_namespace,
    JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 6, 'value', 'stringValue') as k8s_pod_name,
    JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 7, 'value', 'stringValue') as k8s_container_name,
    JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 8, 'value', 'stringValue') as k8s_deployment_name,
    JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 9, 'value', 'stringValue') as k8s_node_name,

    -- Log type (fallback: empty)
    JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'attributes', 1, 'value', 'stringValue') as log_type,

    -- Audit compliance (fallback: false)
    toBool(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'attributes', 2, 'value', 'boolValue')) as audit_compliance,

    -- Store full attributes as JSON for flexibility
    JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes') as resource_attributes,
    JSONExtractRaw(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'attributes') as log_attributes

FROM audit_db.audit_logs_queue
WHERE length(raw) > 0;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Recreate Kafka Queue: Audit Traces (JSONAsString format)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.audit_traces_queue (
    raw String  -- Entire OTLP JSON message as string
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9094',
    kafka_topic_list = 'otel.audit.traces',
    kafka_group_name = 'clickhouse-audit-traces-consumer',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576,
    kafka_skip_broken_messages = 10,
    kafka_security_protocol = 'SASL_PLAINTEXT',
    kafka_sasl_mechanism = 'SCRAM-SHA-512',
    kafka_sasl_username = 'superuser',
    kafka_sasl_password = 'RedpandaSASL2024';
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Recreate Materialized View: Parse OTLP JSON Traces
-- OTLP Structure: resourceSpans[0].scopeSpans[0].spans[0]
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_traces
TO audit_db.otel_audit_traces
AS SELECT
    -- Identity
    toFixedString(unhex(JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'traceId')), 16) as trace_id,
    toFixedString(unhex(JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'spanId')), 8) as span_id,
    toFixedString(unhex(JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'parentSpanId')), 8) as parent_span_id,

    -- Timing
    toDateTime64(
        toUInt64(JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'startTimeUnixNano')) / 1000000000,
        9,
        'UTC'
    ) as timestamp,

    toUInt64(JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'endTimeUnixNano')) -
    toUInt64(JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'startTimeUnixNano')) as duration_ns,

    -- Span Info
    JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'name') as span_name,

    multiIf(
        JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'kind') = '1', 'INTERNAL',
        JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'kind') = '2', 'SERVER',
        JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'kind') = '3', 'CLIENT',
        JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'kind') = '4', 'PRODUCER',
        JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'kind') = '5', 'CONSUMER',
        'UNSPECIFIED'
    ) as span_kind,

    multiIf(
        JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'status', 'code') = '0', 'UNSET',
        JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'status', 'code') = '1', 'OK',
        JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'status', 'code') = '2', 'ERROR',
        'UNSET'
    ) as status_code,

    -- Service & Tenant
    coalesce(
        JSONExtractString(raw, 'resourceSpans', 1, 'resource', 'attributes', 1, 'value', 'stringValue'),
        'unknown-service'
    ) as service_name,

    coalesce(
        JSONExtractString(raw, 'resourceSpans', 1, 'resource', 'attributes', 2, 'value', 'stringValue'),
        'system'
    ) as tenant_id,

    coalesce(
        JSONExtractString(raw, 'resourceSpans', 1, 'resource', 'attributes', 3, 'value', 'stringValue'),
        'development'
    ) as environment,

    -- Kubernetes Context
    JSONExtractString(raw, 'resourceSpans', 1, 'resource', 'attributes', 4, 'value', 'stringValue') as cluster,
    JSONExtractString(raw, 'resourceSpans', 1, 'resource', 'attributes', 5, 'value', 'stringValue') as k8s_namespace,
    JSONExtractString(raw, 'resourceSpans', 1, 'resource', 'attributes', 6, 'value', 'stringValue') as k8s_pod_name,
    JSONExtractString(raw, 'resourceSpans', 1, 'resource', 'attributes', 7, 'value', 'stringValue') as k8s_deployment_name,
    JSONExtractString(raw, 'resourceSpans', 1, 'resource', 'attributes', 8, 'value', 'stringValue') as k8s_node_name,

    -- Attributes
    JSONExtractRaw(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'attributes') as span_attributes,
    JSONExtractRaw(raw, 'resourceSpans', 1, 'resource', 'attributes') as resource_attributes

FROM audit_db.audit_traces_queue
WHERE length(raw) > 0;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Recreate Kafka Queue: Audit Metrics (JSONAsString format)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.audit_metrics_queue (
    raw String  -- Entire OTLP JSON message as string
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9094',
    kafka_topic_list = 'otel.audit.metrics',
    kafka_group_name = 'clickhouse-audit-metrics-consumer',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576,
    kafka_skip_broken_messages = 10,
    kafka_security_protocol = 'SASL_PLAINTEXT',
    kafka_sasl_mechanism = 'SCRAM-SHA-512',
    kafka_sasl_username = 'superuser',
    kafka_sasl_password = 'RedpandaSASL2024';
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Recreate Materialized View: Parse OTLP JSON Metrics
-- OTLP Structure: resourceMetrics[0].scopeMetrics[0].metrics[0].gauge.dataPoints[0]
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_metrics
TO audit_db.otel_audit_metrics
AS SELECT
    -- Timing (try gauge first, then sum, then histogram)
    toDateTime64(
        toUInt64(coalesce(
            JSONExtractString(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'gauge', 'dataPoints', 1, 'timeUnixNano'),
            JSONExtractString(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'sum', 'dataPoints', 1, 'timeUnixNano'),
            JSONExtractString(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'histogram', 'dataPoints', 1, 'timeUnixNano')
        )) / 1000000000,
        9,
        'UTC'
    ) as timestamp,

    -- Metric Identity
    JSONExtractString(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'name') as metric_name,

    multiIf(
        JSONExtractRaw(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'gauge') != '', 'gauge',
        JSONExtractRaw(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'sum') != '', 'sum',
        JSONExtractRaw(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'histogram') != '', 'histogram',
        'unknown'
    ) as metric_type,

    -- Value
    toFloat64(coalesce(
        JSONExtractString(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'gauge', 'dataPoints', 1, 'asInt'),
        JSONExtractString(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'gauge', 'dataPoints', 1, 'asDouble'),
        JSONExtractString(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'sum', 'dataPoints', 1, 'asInt'),
        JSONExtractString(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'sum', 'dataPoints', 1, 'asDouble'),
        '0'
    )) as value,

    -- Service & Tenant
    coalesce(
        JSONExtractString(raw, 'resourceMetrics', 1, 'resource', 'attributes', 1, 'value', 'stringValue'),
        'unknown-service'
    ) as service_name,

    coalesce(
        JSONExtractString(raw, 'resourceMetrics', 1, 'resource', 'attributes', 2, 'value', 'stringValue'),
        'system'
    ) as tenant_id,

    coalesce(
        JSONExtractString(raw, 'resourceMetrics', 1, 'resource', 'attributes', 3, 'value', 'stringValue'),
        'development'
    ) as environment,

    -- Kubernetes Context
    JSONExtractString(raw, 'resourceMetrics', 1, 'resource', 'attributes', 4, 'value', 'stringValue') as cluster,
    JSONExtractString(raw, 'resourceMetrics', 1, 'resource', 'attributes', 5, 'value', 'stringValue') as k8s_namespace,
    JSONExtractString(raw, 'resourceMetrics', 1, 'resource', 'attributes', 6, 'value', 'stringValue') as k8s_pod_name,
    JSONExtractString(raw, 'resourceMetrics', 1, 'resource', 'attributes', 7, 'value', 'stringValue') as k8s_deployment_name,
    JSONExtractString(raw, 'resourceMetrics', 1, 'resource', 'attributes', 8, 'value', 'stringValue') as k8s_node_name,

    -- Attributes
    JSONExtractRaw(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'gauge', 'dataPoints', 1, 'attributes') as metric_attributes,
    JSONExtractRaw(raw, 'resourceMetrics', 1, 'resource', 'attributes') as resource_attributes

FROM audit_db.audit_metrics_queue
WHERE length(raw) > 0;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Rollback: Remove JSONAsString tables and recreate with JSONEachRow (revert to migration 006)
DROP VIEW IF EXISTS audit_db.mv_audit_metrics;
DROP VIEW IF EXISTS audit_db.mv_audit_traces;
DROP VIEW IF EXISTS audit_db.mv_audit_logs;

DROP TABLE IF EXISTS audit_db.audit_metrics_queue;
DROP TABLE IF EXISTS audit_db.audit_traces_queue;
DROP TABLE IF EXISTS audit_db.audit_logs_queue;

-- Note: To fully rollback, re-run migration 006
-- +goose StatementEnd
