# Post-Phase 3-P3: ClickHouse Kafka Engine Integration

> **Status**: ✅ Completed
> **Implementation Date**: 2026-01-19
> **Completion Date**: 2026-01-20
> **Priority**: P1 (High)
> **Dependencies**: Post-Phase 3-P2 (OTEL Collector)
> **Repository**: infrastructure/clickhouse
> **Verification Guide**: [POST_PHASE3_P3_VERIFICATION.md](POST_PHASE3_P3_VERIFICATION.md)
> **Migrations**: 007 (OTLP JSON), 008 (arrayFirst), 009 (NULL severity), 010 (Complete NULL handling)
> **Result**: 3,779 logs, 2 services, 10 namespaces, 0 lag
> **Related**: [POST_PHASE3_P6_OTLP_JSON_PARSING.md](POST_PHASE3_P6_OTLP_JSON_PARSING.md)

---

## Objective

Configure ClickHouse to consume OTLP data from Kafka topics using native Kafka Engine and Materialized Views.

### Architecture

```
Kafka Topics                    ClickHouse
┌───────────────────┐          ┌────────────────────────────┐
│ otel.audit.logs   │──────────>│ audit_logs_queue (Kafka)  │
│ otel.audit.traces │          │          ↓                 │
│ otel.audit.metrics│          │ Materialized View          │
└───────────────────┘          │          ↓                 │
                               │ otel_audit_logs (MergeTree)│
                               │ - 7 year TTL               │
                               │ - Monthly partitions       │
                               │ - Bloom filter indexes     │
                               └────────────────────────────┘
```

---

## Implementation

### Create Migration File

**File**: `infrastructure/clickhouse/migrations/20260120000000_otel_audit_tables.sql`

```sql
-- +goose Up
-- +goose StatementBegin

-- Kafka queue for audit logs
CREATE TABLE IF NOT EXISTS audit_db.audit_logs_queue (
    resource_logs String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel.audit.logs',
    kafka_group_name = 'clickhouse-audit-logs-consumer',
    kafka_format = 'Protobuf',
    kafka_schema = 'opentelemetry.proto.logs.v1.ResourceLogs',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576;

-- Target table for audit logs
CREATE TABLE IF NOT EXISTS audit_db.otel_audit_logs (
    timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    tenant_id LowCardinality(String),
    environment LowCardinality(String),
    trace_id FixedString(16),
    span_id FixedString(8),
    severity_text LowCardinality(String),
    severity_number UInt8,
    service_name LowCardinality(String),
    body String,
    resource_attributes Map(String, String),
    log_attributes Map(String, String),
    log_type LowCardinality(String),
    audit_compliance Bool DEFAULT false,
    date Date MATERIALIZED toDate(timestamp),

    INDEX idx_tenant_id tenant_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_log_type log_type TYPE set(0) GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, tenant_id, log_type, timestamp, trace_id)
TTL date + INTERVAL 7 YEAR DELETE
SETTINGS index_granularity = 8192;

-- Materialized view to consume from Kafka
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_logs TO audit_db.otel_audit_logs AS
SELECT
    fromUnixTimestamp64Nano(JSONExtractUInt(resource_logs, 'timeUnixNano')) AS timestamp,
    JSONExtractString(resource_logs, 'resource', 'attributes', 'tenant.id') AS tenant_id,
    JSONExtractString(resource_logs, 'resource', 'attributes', 'deployment.environment') AS environment,
    unhex(JSONExtractString(resource_logs, 'traceId')) AS trace_id,
    unhex(JSONExtractString(resource_logs, 'spanId')) AS span_id,
    JSONExtractString(resource_logs, 'severityText') AS severity_text,
    JSONExtractUInt(resource_logs, 'severityNumber') AS severity_number,
    JSONExtractString(resource_logs, 'resource', 'attributes', 'service.name') AS service_name,
    JSONExtractString(resource_logs, 'body', 'stringValue') AS body,
    CAST(JSONExtract(resource_logs, 'resource', 'attributes', 'Map(String, String)'), 'Map(String, String)') AS resource_attributes,
    CAST(JSONExtract(resource_logs, 'attributes', 'Map(String, String)'), 'Map(String, String)') AS log_attributes,
    JSONExtractString(resource_logs, 'attributes', 'log.type') AS log_type,
    JSONExtractBool(resource_logs, 'attributes', 'audit.compliance') AS audit_compliance
FROM audit_db.audit_logs_queue;

-- Kafka queue for traces
CREATE TABLE IF NOT EXISTS audit_db.audit_traces_queue (
    resource_spans String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel.audit.traces',
    kafka_group_name = 'clickhouse-audit-traces-consumer',
    kafka_format = 'Protobuf',
    kafka_schema = 'opentelemetry.proto.trace.v1.ResourceSpans',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576;

-- Target table for traces
CREATE TABLE IF NOT EXISTS audit_db.otel_audit_traces (
    timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    tenant_id LowCardinality(String),
    environment LowCardinality(String),
    trace_id FixedString(16),
    span_id FixedString(8),
    parent_span_id FixedString(8),
    service_name LowCardinality(String),
    span_name String,
    duration_ns UInt64,
    status_code LowCardinality(String),
    span_attributes Map(String, String),
    date Date MATERIALIZED toDate(timestamp),

    INDEX idx_tenant_id tenant_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, tenant_id, timestamp, trace_id, span_id)
TTL date + INTERVAL 90 DAY DELETE
SETTINGS index_granularity = 8192;

-- Materialized view for traces
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_traces TO audit_db.otel_audit_traces AS
SELECT
    fromUnixTimestamp64Nano(JSONExtractUInt(resource_spans, 'startTimeUnixNano')) AS timestamp,
    JSONExtractString(resource_spans, 'resource', 'attributes', 'tenant.id') AS tenant_id,
    JSONExtractString(resource_spans, 'resource', 'attributes', 'deployment.environment') AS environment,
    unhex(JSONExtractString(resource_spans, 'traceId')) AS trace_id,
    unhex(JSONExtractString(resource_spans, 'spanId')) AS span_id,
    unhex(JSONExtractString(resource_spans, 'parentSpanId')) AS parent_span_id,
    JSONExtractString(resource_spans, 'resource', 'attributes', 'service.name') AS service_name,
    JSONExtractString(resource_spans, 'name') AS span_name,
    JSONExtractUInt(resource_spans, 'endTimeUnixNano') - JSONExtractUInt(resource_spans, 'startTimeUnixNano') AS duration_ns,
    JSONExtractString(resource_spans, 'status', 'code') AS status_code,
    CAST(JSONExtract(resource_spans, 'attributes', 'Map(String, String)'), 'Map(String, String)') AS span_attributes
FROM audit_db.audit_traces_queue;

-- Kafka queue for metrics
CREATE TABLE IF NOT EXISTS audit_db.audit_metrics_queue (
    resource_metrics String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel.audit.metrics',
    kafka_group_name = 'clickhouse-audit-metrics-consumer',
    kafka_format = 'Protobuf',
    kafka_schema = 'opentelemetry.proto.metrics.v1.ResourceMetrics',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576;

-- Target table for metrics
CREATE TABLE IF NOT EXISTS audit_db.otel_audit_metrics (
    timestamp DateTime64(9) CODEC(Delta, ZSTD(1)),
    tenant_id LowCardinality(String),
    environment LowCardinality(String),
    service_name LowCardinality(String),
    metric_name String,
    metric_type LowCardinality(String),
    value Float64,
    metric_attributes Map(String, String),
    date Date MATERIALIZED toDate(timestamp),

    INDEX idx_tenant_id tenant_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_metric_name metric_name TYPE bloom_filter GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, tenant_id, metric_name, timestamp)
TTL date + INTERVAL 1 YEAR DELETE
SETTINGS index_granularity = 8192;

-- Materialized view for metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_metrics TO audit_db.otel_audit_metrics AS
SELECT
    fromUnixTimestamp64Nano(JSONExtractUInt(resource_metrics, 'timeUnixNano')) AS timestamp,
    JSONExtractString(resource_metrics, 'resource', 'attributes', 'tenant.id') AS tenant_id,
    JSONExtractString(resource_metrics, 'resource', 'attributes', 'deployment.environment') AS environment,
    JSONExtractString(resource_metrics, 'resource', 'attributes', 'service.name') AS service_name,
    JSONExtractString(resource_metrics, 'name') AS metric_name,
    JSONExtractString(resource_metrics, 'type') AS metric_type,
    JSONExtractFloat(resource_metrics, 'value') AS value,
    CAST(JSONExtract(resource_metrics, 'attributes', 'Map(String, String)'), 'Map(String, String)') AS metric_attributes
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

-- +goose StatementEnd
```

---

## Verification

### Run Migration

```bash
cd infrastructure/clickhouse

# Test migration locally
goose -dir migrations clickhouse "clickhouse://localhost:9000/audit_db" up

# Verify tables created
clickhouse-client --query="SHOW TABLES FROM audit_db LIKE '%otel%'"

# Expected output:
# audit_logs_queue
# audit_traces_queue
# audit_metrics_queue
# otel_audit_logs
# otel_audit_traces
# otel_audit_metrics
# mv_audit_logs
# mv_audit_traces
# mv_audit_metrics
```

### Test Data Flow

```bash
# Check if Kafka queues are consuming
clickhouse-client --query="
SELECT count() FROM audit_db.audit_logs_queue
SETTINGS stream_like_engine_allow_direct_select = 1"

# Check if logs are being written to target table
clickhouse-client --query="
SELECT
  count() as total_logs,
  uniqExact(tenant_id) as unique_tenants,
  countIf(log_type = 'audit') as audit_logs,
  countIf(log_type != 'audit') as regular_logs
FROM audit_db.otel_audit_logs"

# Check recent audit logs
clickhouse-client --query="
SELECT
  timestamp,
  tenant_id,
  service_name,
  log_type,
  body
FROM audit_db.otel_audit_logs
WHERE log_type = 'audit'
ORDER BY timestamp DESC
LIMIT 10"
```

### Monitor Consumer Lag

```bash
# Check Kafka consumer lag
kubectl exec -it kafka-0 -n kafka -- \
  kafka-consumer-groups --bootstrap-server localhost:9092 \
    --describe --group clickhouse-audit-logs-consumer

# Expected output showing LAG column
```

---

## Next Phase Dependency

**Provides for Phase 4** (Frontend SDK):

1. ✅ ClickHouse tables ready to receive telemetry data
2. ✅ Audit logs retained for 7 years
3. ✅ Traces retained for 90 days
4. ✅ Metrics retained for 1 year
5. ✅ Ready to query for verification

---

**Next Phase**: [POST_PHASE3_P4_FRONTEND_SDK.md](POST_PHASE3_P4_FRONTEND_SDK.md)
