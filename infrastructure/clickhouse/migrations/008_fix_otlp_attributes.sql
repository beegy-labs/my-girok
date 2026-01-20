-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- Migration 008: Fix OTLP Attribute Extraction
-- Problem: Migration 007 uses positional indexing for attributes,
--          but OTLP sends attributes as key-value array
-- Solution: Use helper function to extract attributes by key
-- ============================================================

-- Drop existing materialized views (keep Kafka queues running)
DROP VIEW IF EXISTS audit_db_dev.mv_audit_logs;
-- +goose StatementEnd

-- +goose StatementBegin
DROP VIEW IF EXISTS audit_db_dev.mv_audit_traces;
-- +goose StatementEnd

-- +goose StatementBegin
DROP VIEW IF EXISTS audit_db_dev.mv_audit_metrics;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Recreate Materialized View: Parse OTLP JSON Logs (Fixed)
-- Use JSONExtractKeysAndValues to extract attributes by key
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db_dev.mv_audit_logs
TO audit_db_dev.otel_audit_logs
AS
WITH parsed_attributes AS (
    SELECT
        raw,
        arrayMap(
            x -> (JSONExtractString(x, 'key'), JSONExtractString(x, 'value', 'stringValue')),
            JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes'))
        ) AS resource_attrs,
        arrayMap(
            x -> (JSONExtractString(x, 'key'), JSONExtractString(x, 'value', 'stringValue')),
            JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'attributes'))
        ) AS log_attrs
    FROM audit_db_dev.audit_logs_queue
    WHERE length(raw) > 0
)
SELECT
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

    -- Service name (extract by key from resource attributes)
    coalesce(
        arrayFirst(x -> x.1 = 'service.name', resource_attrs).2,
        arrayFirst(x -> x.1 = 'k8s.pod.name', resource_attrs).2,
        'unknown-service'
    ) as service_name,

    -- Tenant ID (extract by key)
    coalesce(
        arrayFirst(x -> x.1 = 'tenant.id', resource_attrs).2,
        'system'
    ) as tenant_id,

    -- Environment (extract by key)
    coalesce(
        arrayFirst(x -> x.1 = 'environment', resource_attrs).2,
        'development'
    ) as environment,

    -- Kubernetes context (extract by key)
    arrayFirst(x -> x.1 = 'k8s.cluster.name', resource_attrs).2 as cluster,
    arrayFirst(x -> x.1 = 'k8s.namespace.name', resource_attrs).2 as k8s_namespace,
    arrayFirst(x -> x.1 = 'k8s.pod.name', resource_attrs).2 as k8s_pod_name,
    arrayFirst(x -> x.1 = 'k8s.container.name', resource_attrs).2 as k8s_container_name,
    arrayFirst(x -> x.1 = 'k8s.deployment.name', resource_attrs).2 as k8s_deployment_name,
    arrayFirst(x -> x.1 = 'k8s.node.name', resource_attrs).2 as k8s_node_name,

    -- Log attributes (extract by key)
    arrayFirst(x -> x.1 = 'log.type', log_attrs).2 as log_type,

    -- Audit compliance
    if(
        arrayFirst(x -> x.1 = 'audit.compliance', log_attrs).2 = 'true',
        true,
        false
    ) as audit_compliance,

    -- Store full attributes as JSON for flexibility
    JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes') as resource_attributes,
    JSONExtractRaw(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'attributes') as log_attributes

FROM parsed_attributes;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Recreate Materialized View: Parse OTLP JSON Traces (Fixed)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db_dev.mv_audit_traces
TO audit_db_dev.otel_audit_traces
AS
WITH parsed_attributes AS (
    SELECT
        raw,
        arrayMap(
            x -> (JSONExtractString(x, 'key'), JSONExtractString(x, 'value', 'stringValue')),
            JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceSpans', 1, 'resource', 'attributes'))
        ) AS resource_attrs
    FROM audit_db_dev.audit_traces_queue
    WHERE length(raw) > 0
)
SELECT
    -- Identity
    toFixedString(unhex(JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'traceId')), 16) as trace_id,
    toFixedString(unhex(JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'spanId')), 8) as span_id,
    if(
        JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'parentSpanId') != '',
        toFixedString(unhex(JSONExtractString(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'parentSpanId')), 8),
        NULL
    ) as parent_span_id,

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

    -- Service & Tenant (extract by key)
    coalesce(
        arrayFirst(x -> x.1 = 'service.name', resource_attrs).2,
        arrayFirst(x -> x.1 = 'k8s.pod.name', resource_attrs).2,
        'unknown-service'
    ) as service_name,

    coalesce(
        arrayFirst(x -> x.1 = 'tenant.id', resource_attrs).2,
        'system'
    ) as tenant_id,

    coalesce(
        arrayFirst(x -> x.1 = 'environment', resource_attrs).2,
        'development'
    ) as environment,

    -- Kubernetes Context (extract by key)
    arrayFirst(x -> x.1 = 'k8s.cluster.name', resource_attrs).2 as cluster,
    arrayFirst(x -> x.1 = 'k8s.namespace.name', resource_attrs).2 as k8s_namespace,
    arrayFirst(x -> x.1 = 'k8s.pod.name', resource_attrs).2 as k8s_pod_name,
    arrayFirst(x -> x.1 = 'k8s.deployment.name', resource_attrs).2 as k8s_deployment_name,
    arrayFirst(x -> x.1 = 'k8s.node.name', resource_attrs).2 as k8s_node_name,

    -- Attributes
    JSONExtractRaw(raw, 'resourceSpans', 1, 'scopeSpans', 1, 'spans', 1, 'attributes') as span_attributes,
    JSONExtractRaw(raw, 'resourceSpans', 1, 'resource', 'attributes') as resource_attributes

FROM parsed_attributes;
-- +goose StatementEnd

-- +goose StatementBegin
-- ============================================================
-- Recreate Materialized View: Parse OTLP JSON Metrics (Fixed)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db_dev.mv_audit_metrics
TO audit_db_dev.otel_audit_metrics
AS
WITH parsed_attributes AS (
    SELECT
        raw,
        arrayMap(
            x -> (JSONExtractString(x, 'key'), JSONExtractString(x, 'value', 'stringValue')),
            JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceMetrics', 1, 'resource', 'attributes'))
        ) AS resource_attrs
    FROM audit_db_dev.audit_metrics_queue
    WHERE length(raw) > 0
)
SELECT
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

    -- Service & Tenant (extract by key)
    coalesce(
        arrayFirst(x -> x.1 = 'service.name', resource_attrs).2,
        arrayFirst(x -> x.1 = 'k8s.pod.name', resource_attrs).2,
        'unknown-service'
    ) as service_name,

    coalesce(
        arrayFirst(x -> x.1 = 'tenant.id', resource_attrs).2,
        'system'
    ) as tenant_id,

    coalesce(
        arrayFirst(x -> x.1 = 'environment', resource_attrs).2,
        'development'
    ) as environment,

    -- Kubernetes Context (extract by key)
    arrayFirst(x -> x.1 = 'k8s.cluster.name', resource_attrs).2 as cluster,
    arrayFirst(x -> x.1 = 'k8s.namespace.name', resource_attrs).2 as k8s_namespace,
    arrayFirst(x -> x.1 = 'k8s.pod.name', resource_attrs).2 as k8s_pod_name,
    arrayFirst(x -> x.1 = 'k8s.deployment.name', resource_attrs).2 as k8s_deployment_name,
    arrayFirst(x -> x.1 = 'k8s.node.name', resource_attrs).2 as k8s_node_name,

    -- Attributes
    JSONExtractRaw(raw, 'resourceMetrics', 1, 'scopeMetrics', 1, 'metrics', 1, 'gauge', 'dataPoints', 1, 'attributes') as metric_attributes,
    JSONExtractRaw(raw, 'resourceMetrics', 1, 'resource', 'attributes') as resource_attributes

FROM parsed_attributes;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Rollback: Recreate views from migration 007
DROP VIEW IF EXISTS audit_db_dev.mv_audit_metrics;
DROP VIEW IF EXISTS audit_db_dev.mv_audit_traces;
DROP VIEW IF EXISTS audit_db_dev.mv_audit_logs;
-- Note: Run migration 007 to restore previous views
-- +goose StatementEnd
