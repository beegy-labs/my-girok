-- ============================================================
-- Kafka Engine Tables for OTEL Pipeline
-- Source: Redpanda (kafka.girok.dev:9093)
-- Architecture: Services → OTEL Collector → Kafka → ClickHouse
--
-- NOTE: This requires OTEL Collector to use encoding: otlp_json
-- or a transformation layer (Vector/Benthos) between Kafka and ClickHouse
-- ============================================================

-- ============================================================
-- Traces Kafka Consumer
-- Topic: otel-traces
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.traces_kafka ON CLUSTER 'my_cluster' (
    -- Raw OTLP JSON will be parsed by the MV
    trace_id String,
    span_id String,
    parent_span_id String,
    trace_state String,
    timestamp DateTime64(9, 'UTC'),
    duration_ns UInt64,
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

-- Materialized View to insert into traces table
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.traces_kafka_mv ON CLUSTER 'my_cluster'
TO otel_db.traces_local
AS SELECT
    trace_id,
    span_id,
    parent_span_id,
    trace_state,
    timestamp,
    toDate(timestamp) as date,
    duration_ns,
    duration_ns as start_time_ns,
    duration_ns as end_time_ns,
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


-- ============================================================
-- Metrics Kafka Consumer
-- Topic: otel-metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.metrics_kafka ON CLUSTER 'my_cluster' (
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

-- Materialized View to insert into metrics table
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.metrics_kafka_mv ON CLUSTER 'my_cluster'
TO otel_db.metrics_local
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


-- ============================================================
-- Logs Kafka Consumer
-- Topic: otel-logs
-- ============================================================
CREATE TABLE IF NOT EXISTS otel_db.logs_kafka ON CLUSTER 'my_cluster' (
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

-- Materialized View to insert into logs table
CREATE MATERIALIZED VIEW IF NOT EXISTS otel_db.logs_kafka_mv ON CLUSTER 'my_cluster'
TO otel_db.logs_local
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


-- ============================================================
-- Admin Audit Kafka Consumer
-- Topic: otel-audit
-- Target: audit_db.admin_audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_db.audit_kafka ON CLUSTER 'my_cluster' (
    id UUID,
    timestamp DateTime64(3, 'UTC'),
    actor_id UUID,
    actor_type String,
    actor_email String,
    actor_name String,
    actor_scope String,
    actor_role String,
    actor_ip String,
    service_id UUID,
    service_slug String,
    service_name String,
    resource String,
    resource_version UInt32,
    action String,
    target_id UUID,
    target_type String,
    target_identifier String,
    operation_type String,
    before_state Nullable(String),
    after_state Nullable(String),
    changed_fields Array(String),
    change_diff String,
    reason String,
    business_justification Nullable(String),
    ticket_id Nullable(String),
    approval_id Nullable(String),
    compliance_tags Array(String),
    data_classification String,
    pii_accessed UInt8,
    pii_fields Array(String),
    source String,
    source_version String,
    trace_id String,
    span_id String,
    ui_event_id Nullable(UUID),
    api_log_id Nullable(UUID),
    checksum String,
    previous_log_id Nullable(UUID),
    retention_until Date,
    legal_hold UInt8
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel-audit',
    kafka_group_name = 'clickhouse-audit',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_max_block_size = 65536,
    kafka_skip_broken_messages = 10;

-- Materialized View to insert into admin_audit_logs table
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.audit_kafka_mv ON CLUSTER 'my_cluster'
TO audit_db.admin_audit_logs_local
AS SELECT
    id,
    timestamp,
    toDate(timestamp) as date,
    actor_id,
    actor_type,
    actor_email,
    actor_name,
    actor_scope,
    actor_role,
    actor_ip,
    service_id,
    service_slug,
    service_name,
    resource,
    resource_version,
    action,
    target_id,
    target_type,
    target_identifier,
    operation_type,
    before_state,
    after_state,
    changed_fields,
    change_diff,
    reason,
    business_justification,
    ticket_id,
    approval_id,
    compliance_tags,
    data_classification,
    pii_accessed = 1 as pii_accessed,
    pii_fields,
    source,
    source_version,
    trace_id,
    span_id,
    ui_event_id,
    api_log_id,
    checksum,
    previous_log_id,
    retention_until,
    legal_hold = 1 as legal_hold
FROM audit_db.audit_kafka;


-- ============================================================
-- Analytics Events Kafka Consumer
-- Topic: analytics-events
-- Target: analytics_db.events
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_db.events_kafka ON CLUSTER 'my_cluster' (
    id UUID,
    timestamp DateTime64(3, 'UTC'),
    session_id UUID,
    user_id Nullable(UUID),
    event_name String,
    event_category String,
    properties String,
    page_path String,
    page_title String,
    element_id Nullable(String),
    element_class Nullable(String),
    element_text Nullable(String)
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'analytics-events',
    kafka_group_name = 'clickhouse-analytics',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_max_block_size = 65536,
    kafka_skip_broken_messages = 10;

-- Materialized View to insert into events table
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_db.events_kafka_mv ON CLUSTER 'my_cluster'
TO analytics_db.events_local
AS SELECT
    id,
    timestamp,
    session_id,
    user_id,
    event_name,
    event_category,
    properties,
    page_path,
    page_title,
    element_id,
    element_class,
    element_text
FROM analytics_db.events_kafka;


-- ============================================================
-- Admin UI Events Kafka Consumer (optional)
-- Topic: admin-ui-events (if separate from audit)
-- Target: audit_db.admin_ui_events
-- ============================================================
-- Note: Admin UI events can also flow through otel-audit topic
-- This is an optional separate consumer for UI-specific events

-- CREATE TABLE IF NOT EXISTS audit_db.ui_events_kafka ON CLUSTER 'my_cluster' (
--     ... (schema matches admin_ui_events)
-- ) ENGINE = Kafka()
-- SETTINGS
--     kafka_broker_list = 'kafka.girok.dev:9093',
--     kafka_topic_list = 'admin-ui-events',
--     kafka_group_name = 'clickhouse-ui-events',
--     kafka_format = 'JSONEachRow';
