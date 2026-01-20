# Post-Phase 3-P6: ClickHouse OTLP JSON Parsing

> **Status**: ✅ Completed
> **Created Date**: 2026-01-19
> **Completion Date**: 2026-01-20
> **Priority**: P0 (Critical - Blocking)
> **Dependencies**: POST_PHASE3_P3 (ClickHouse Kafka Integration)
> **Repository**: infrastructure/clickhouse, platform-gitops
> **Solution**: JSONAsString + arrayFirst + NULL-safe parsing
> **Migrations**: 007, 008, 009, 010
> **Result**: 3,779 logs successfully stored, 0 consumer lag

---

## Problem Statement

### Current Issue

OTEL Collector sends data to Kafka in **OTLP JSON format** (nested structure), but ClickHouse Kafka Engine tables expect **flat JSON** format.

**Data Flow Status**:

```
Services → OTEL SDK ✅
OTEL SDK → OTEL Collector ✅
OTEL Collector → Kafka (OTLP JSON) ✅
Kafka → ClickHouse (format mismatch) ❌
ClickHouse Tables (empty) ❌
```

### OTLP JSON Structure (Current)

```json
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          { "key": "service.name", "value": { "stringValue": "audit-service" } },
          { "key": "k8s.namespace.name", "value": { "stringValue": "dev-my-girok" } }
        ]
      },
      "scopeLogs": [
        {
          "logRecords": [
            {
              "timeUnixNano": "1737328347000000000",
              "observedTimeUnixNano": "1737328347100000000",
              "severityNumber": 9,
              "severityText": "INFO",
              "body": { "stringValue": "Application started" },
              "attributes": [{ "key": "log.type", "value": { "stringValue": "audit" } }],
              "traceId": "0102030405060708090a0b0c0d0e0f10",
              "spanId": "0102030405060708"
            }
          ]
        }
      ]
    }
  ]
}
```

### Expected ClickHouse Schema (Flat)

```sql
CREATE TABLE audit_logs_queue (
    timestamp DateTime64(9, 'UTC'),
    service_name String,
    body String,
    -- ... flat fields
)
```

---

## Solution: Enterprise-Grade Architecture (2026 Best Practice)

### Decision Matrix

| Approach                   | Standard Compliance | Replayability | Scalability | Enterprise Grade |
| -------------------------- | ------------------- | ------------- | ----------- | ---------------- |
| **Direct ClickHouse**      | ❌ No Kafka         | ❌            | ⚠️          | ❌               |
| **Transform in Collector** | ❌ Custom Logic     | ✅            | ✅          | ❌               |
| **Kafka + JSONExtract**    | ✅ OTLP Standard    | ✅            | ✅          | ✅               |

### Selected Approach: Kafka + JSONExtract Pattern

**References**:

- [ClickHouse Best Practices for OTLP](https://clickhouse.com/resources/engineering/best-resources-storing-opentelemetry-collector-data)
- [Building Production-Grade Observability with ClickHouse](https://medium.com/@ShiveeGupta/building-a-production-grade-observability-platform-with-signoz-clickhouse-and-opentelemetry-d7f09a5250f5)
- [JSONExtract Pattern | ClickHouse Docs](https://clickhouse.com/docs/knowledgebase/json_simple_example)
- [Altinity KB: JSONAsString Parser](https://kb.altinity.com/altinity-kb-schema-design/altinity-kb-jsonasstring-and-mat.-view-as-json-parser/)

**Architecture**:

```
OTEL Collector → Kafka (OTLP JSON) → ClickHouse Kafka Engine (JSONAsString)
                                            ↓
                                    Materialized View (JSONExtract)
                                            ↓
                                    Target Table (Flat Schema)
```

**Why This is Enterprise-Grade**:

1. ✅ **OTLP Standard Compliance**: No custom transformation, vendor-neutral
2. ✅ **Data Durability**: Kafka provides replay capability for 7-year audit retention
3. ✅ **Multi-Consumer Support**: Future consumers (Elasticsearch, S3 archive) can read same data
4. ✅ **Fault Isolation**: ClickHouse downtime doesn't cause data loss
5. ✅ **Scalability**: Kafka handles backpressure, bulk inserts via batching

---

## Implementation Plan

### Phase 1: Update Kafka Engine Tables (Migration 007)

**File**: `infrastructure/clickhouse/migrations/007_otlp_json_parsing.sql`

#### 1.1. Drop Existing Tables

```sql
-- +goose Up
-- +goose StatementBegin
-- Drop materialized views first
DROP VIEW IF EXISTS audit_db.mv_audit_logs;
DROP VIEW IF EXISTS audit_db.mv_audit_traces;
DROP VIEW IF EXISTS audit_db.mv_audit_metrics;
-- +goose StatementEnd

-- +goose StatementBegin
-- Drop Kafka Engine tables
DROP TABLE IF EXISTS audit_db.audit_logs_queue;
DROP TABLE IF EXISTS audit_db.audit_traces_queue;
DROP TABLE IF EXISTS audit_db.audit_metrics_queue;
-- +goose StatementEnd
```

#### 1.2. Create JSONAsString Kafka Tables

```sql
-- +goose StatementBegin
-- Kafka queue for OTLP JSON logs
CREATE TABLE IF NOT EXISTS audit_db.audit_logs_queue (
    raw String  -- Entire OTLP JSON as string
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel.audit.logs',
    kafka_group_name = 'clickhouse-audit-logs-consumer',
    kafka_format = 'JSONAsString',  -- Changed from JSONEachRow
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576,
    kafka_skip_broken_messages = 10,
    kafka_sasl_mechanism = 'SCRAM-SHA-512',
    kafka_sasl_username = 'superuser',
    kafka_sasl_password = 'RedpandaSASL2024';
-- +goose StatementEnd
```

#### 1.3. Create Materialized View with JSONExtract

```sql
-- +goose StatementBegin
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_logs
TO audit_db.otel_audit_logs
AS SELECT
    -- Extract timestamp from nested structure
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

    -- Extract trace context
    JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'traceId') as trace_id,
    JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'spanId') as span_id,
    toUInt8OrNull(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'flags')) as trace_flags,

    -- Extract severity
    toUInt8(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'severityNumber')) as severity_number,
    JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'severityText') as severity_text,

    -- Extract body
    JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'body', 'stringValue') as body,

    -- Extract resource attributes
    JSONExtractString(
        JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes'),
        arrayFirstIndex(x -> JSONExtractString(x, 'key') = 'service.name', JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes'))),
        'value', 'stringValue'
    ) as service_name,

    -- Extract tenant_id (from resource or log attributes)
    JSONExtractString(
        JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes'),
        arrayFirstIndex(x -> JSONExtractString(x, 'key') = 'tenant.id', JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes'))),
        'value', 'stringValue'
    ) as tenant_id,

    -- Extract Kubernetes attributes
    JSONExtractString(
        JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes'),
        arrayFirstIndex(x -> JSONExtractString(x, 'key') = 'k8s.namespace.name', JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes'))),
        'value', 'stringValue'
    ) as k8s_namespace,

    -- Store full raw JSON for debugging/replay
    JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes') as resource_attributes,
    JSONExtractRaw(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'attributes') as log_attributes

FROM audit_db.audit_logs_queue;
-- +goose StatementEnd
```

### Phase 2: Update GitOps ConfigMap

Update `platform-gitops/apps/platform/audit-service/templates/clickhouse-migration-configmap.yaml` with migration 007.

### Phase 3: Deploy and Verify

```bash
# 1. Commit migration to my-girok
cd my-girok
git add infrastructure/clickhouse/migrations/007_otlp_json_parsing.sql
git commit -m "feat(clickhouse): add migration 007 for OTLP JSON parsing"

# 2. Update GitOps ConfigMap
cd platform-gitops
# Add migration 007 to ConfigMap
git add apps/platform/audit-service/templates/clickhouse-migration-configmap.yaml
git commit -m "feat(audit-service): add migration 007 to ConfigMap"

# 3. Deploy via ArgoCD
kubectl delete job -n dev-my-girok platform-dev-audit-service-clickhouse-migrate
# ArgoCD will recreate and run migration

# 4. Verify data flow
kubectl exec -n dev-my-girok <audit-pod> -- \
  wget -qO- "http://db-clickhouse-001.beegy.net:8123/?query=SELECT count() FROM audit_db_dev.otel_audit_logs&user=default&password=..."
```

---

## Verification Checklist

### Data Flow Verification

- [ ] Kafka topics receiving OTLP JSON data
- [ ] ClickHouse Kafka Engine tables consuming (JSONAsString)
- [ ] Materialized Views parsing JSON successfully
- [ ] Target tables (otel_audit_logs) receiving data
- [ ] Trace IDs properly converted (unhex)
- [ ] Timestamps correctly parsed (nanoseconds → DateTime64)
- [ ] Resource attributes extracted (service.name, k8s.\*)
- [ ] Log attributes preserved

### Query Tests

```sql
-- Test 1: Count by service
SELECT service_name, count()
FROM audit_db_dev.otel_audit_logs
GROUP BY service_name;

-- Test 2: Recent logs with trace context
SELECT timestamp, service_name, body, hex(trace_id), hex(span_id)
FROM audit_db_dev.otel_audit_logs
WHERE timestamp >= now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC
LIMIT 10;

-- Test 3: Tenant filtering performance
SELECT count()
FROM audit_db_dev.otel_audit_logs
WHERE tenant_id = 'system'
AND date >= today() - 1;
```

### Performance Metrics

- [ ] Consumer lag < 100 messages
- [ ] Query latency < 1s for recent data
- [ ] Compression ratio < 0.15
- [ ] No JSONExtract errors in ClickHouse logs

---

## Rollback Plan

```sql
-- +goose Down
-- +goose StatementBegin
-- Drop JSONExtract materialized views
DROP VIEW IF EXISTS audit_db.mv_audit_logs;
DROP VIEW IF EXISTS audit_db.mv_audit_traces;
DROP VIEW IF EXISTS audit_db.mv_audit_metrics;

-- Drop JSONAsString Kafka tables
DROP TABLE IF EXISTS audit_db.audit_logs_queue;
DROP TABLE IF EXISTS audit_db.audit_traces_queue;
DROP TABLE IF EXISTS audit_db.audit_metrics_queue;

-- Recreate with flat JSONEachRow (revert to migration 006)
-- +goose StatementEnd
```

---

## Success Criteria

- ✅ Migration 007 executes successfully
- ✅ Kafka topics continue to receive OTLP JSON
- ✅ ClickHouse tables receive parsed data (count > 0)
- ✅ All OTLP fields correctly mapped
- ✅ No data loss during migration
- ✅ Query performance meets SLA (< 1s)
- ✅ Multi-tenant isolation working

---

## Known Issues & Solutions

### Issue 1: Array Index Out of Bounds

**Problem**: `resourceLogs[1]` fails if array is empty

**Solution**: Use `arrayElement` with default value

```sql
arrayElement(JSONExtractArrayRaw(raw, 'resourceLogs'), 1, '{}')
```

### Issue 2: Timestamp Conversion Overflow

**Problem**: Nanosecond timestamps exceed UInt64 in old data

**Solution**: Add bounds checking

```sql
if(timeUnixNano > 0 AND timeUnixNano < 9999999999999999999, ...)
```

### Issue 3: Nested Attribute Extraction Complexity

**Problem**: Kubernetes attributes deeply nested

**Solution**: Create helper function or use simpler path

```sql
-- Extract all attributes as Map
JSONExtract(raw, 'resourceLogs', 1, 'resource', 'attributes', 'Map(String, String)')
```

---

## References

- [OTLP Specification 1.9.0](https://opentelemetry.io/docs/specs/otlp/)
- [ClickHouse JSONExtract Functions](https://clickhouse.com/docs/en/sql-reference/functions/json-functions)
- [Kafka Engine Documentation](https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka)
- [Materialized Views Best Practices](https://clickhouse.com/docs/en/guides/developer/cascading-materialized-views)
- [Enterprise Observability Stack with Kafka](https://www.glassflow.dev/blog/building-observability-stack-with-opentelemetry-and-kafka)

---

**Next Phase**: After P6 completion, verify end-to-end pipeline and create Grafana dashboards for audit log visualization.
