-- +goose Up
-- +goose StatementBegin
-- ============================================================
-- Migration 009: Fix NULL severityNumber handling
-- Problem: severityNumber can be null in OTLP messages
-- Solution: Use toUInt8OrZero instead of toUInt8
-- ============================================================

-- Drop materialized view
DROP VIEW IF EXISTS audit_db_dev.mv_audit_logs;
-- +goose StatementEnd

-- +goose StatementBegin
-- Recreate with NULL-safe severity handling
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

    -- Severity - FIX: Use toUInt8OrZero to handle NULL
    toUInt8OrZero(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'severityNumber')) as severity_number,
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

-- +goose Down
-- +goose StatementBegin
DROP VIEW IF EXISTS audit_db_dev.mv_audit_logs;
-- Note: Run migration 008 to restore previous view
-- +goose StatementEnd
