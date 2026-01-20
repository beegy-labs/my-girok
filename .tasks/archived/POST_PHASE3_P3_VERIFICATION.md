# POST_PHASE3_P3: ClickHouse Audit Database - Verification Guide

> **Created**: 2026-01-19
> **Status**: Ready for Testing
> **Migration File**: `infrastructure/clickhouse/migrations/005_create_audit_db_otel_tables.sql`

---

## Summary

Created ClickHouse migration for audit-specific OTLP pipeline with long-term retention requirements:

- **audit_db**: Separate database for compliance and audit data
- **Logs**: 7-year retention (vs 30 days for general logs)
- **Traces**: 90-day retention (vs 30 days for general traces)
- **Metrics**: 1-year retention (vs 90 days for general metrics)

---

## Key Design Decisions

### 1. JSON Format Instead of Protobuf

**Changed**: `kafka_format = 'JSONEachRow'` (from Protobuf in spec)

**Rationale**:
- Consistent with existing otel_db pipeline
- No protobuf schema files needed
- Simpler OTEL Collector configuration
- Better debugging capability

### 2. Direct Field Mapping

Kafka queue tables receive structured JSON fields directly, eliminating complex JSONExtract operations in materialized views.

### 3. Tenant-Aware Schema

Added `tenant_id` field to all tables for multi-tenancy support:
- Indexed with bloom filter for fast tenant filtering
- Included in ORDER BY for efficient queries
- Required for audit compliance and data isolation

### 4. Compression Optimization

Using `CODEC(Delta, ZSTD(1))` on timestamp columns:
- Delta encoding for timestamp sequences
- ZSTD compression for storage efficiency
- Critical for 7-year retention

---

## Migration Execution

### Prerequisites

1. ClickHouse server running
2. Kafka topics created (see below)
3. OTEL Collector configured to send to audit topics

### Create Kafka Topics

```bash
# Create audit-specific topics
kubectl exec -it kafka-0 -n kafka -- kafka-topics \
  --bootstrap-server localhost:9092 \
  --create \
  --topic otel.audit.logs \
  --partitions 3 \
  --replication-factor 3 \
  --config retention.ms=220752000000 \
  --config compression.type=zstd

kubectl exec -it kafka-0 -n kafka -- kafka-topics \
  --bootstrap-server localhost:9092 \
  --create \
  --topic otel.audit.traces \
  --partitions 3 \
  --replication-factor 3 \
  --config retention.ms=7776000000 \
  --config compression.type=zstd

kubectl exec -it kafka-0 -n kafka -- kafka-topics \
  --bootstrap-server localhost:9092 \
  --create \
  --topic otel.audit.metrics \
  --partitions 3 \
  --replication-factor 3 \
  --config retention.ms=31536000000 \
  --config compression.type=zstd
```

**Retention Periods**:
- Logs: 220752000000ms = 7 years
- Traces: 7776000000ms = 90 days
- Metrics: 31536000000ms = 365 days

### Run Migration

```bash
cd infrastructure/clickhouse

# Test migration locally
goose -dir migrations clickhouse "clickhouse://localhost:9000/default" up

# Verify tables created
clickhouse-client --query="SHOW TABLES FROM audit_db"
```

**Expected Output**:
```
audit_logs_queue
audit_metrics_queue
audit_traces_queue
mv_audit_logs
mv_audit_metrics
mv_audit_traces
otel_audit_logs
otel_audit_metrics
otel_audit_traces
```

---

## Verification Tests

### 1. Check Database and Tables

```bash
clickhouse-client --query="
SELECT
  database,
  table,
  engine,
  total_rows,
  total_bytes
FROM system.tables
WHERE database = 'audit_db'
FORMAT Vertical"
```

### 2. Verify Kafka Consumers

```bash
# Check if Kafka queues are consuming
clickhouse-client --query="
SELECT count() FROM audit_db.audit_logs_queue
SETTINGS stream_like_engine_allow_direct_select = 1"

# Should return count > 0 if messages flowing
```

### 3. Test Data Flow

After sending test telemetry data:

```bash
# Check audit logs
clickhouse-client --query="
SELECT
  count() as total_logs,
  uniqExact(tenant_id) as unique_tenants,
  countIf(audit_compliance = true) as compliance_logs,
  countIf(log_type = 'audit') as audit_type_logs,
  min(timestamp) as earliest,
  max(timestamp) as latest
FROM audit_db.otel_audit_logs
FORMAT Vertical"

# Check recent audit logs
clickhouse-client --query="
SELECT
  timestamp,
  tenant_id,
  service_name,
  log_type,
  severity_text,
  body
FROM audit_db.otel_audit_logs
ORDER BY timestamp DESC
LIMIT 10
FORMAT Vertical"
```

### 4. Verify Traces

```bash
clickhouse-client --query="
SELECT
  count() as total_spans,
  uniqExact(trace_id) as unique_traces,
  uniqExact(tenant_id) as unique_tenants,
  avg(duration_ns) / 1000000 as avg_duration_ms
FROM audit_db.otel_audit_traces
FORMAT Vertical"
```

### 5. Verify Metrics

```bash
clickhouse-client --query="
SELECT
  metric_name,
  count() as data_points,
  avg(value) as avg_value,
  uniqExact(tenant_id) as tenants
FROM audit_db.otel_audit_metrics
GROUP BY metric_name
ORDER BY data_points DESC
LIMIT 20
FORMAT Vertical"
```

### 6. Monitor Consumer Lag

```bash
kubectl exec -it kafka-0 -n kafka -- \
  kafka-consumer-groups --bootstrap-server localhost:9092 \
    --describe --group clickhouse-audit-logs-consumer

kubectl exec -it kafka-0 -n kafka -- \
  kafka-consumer-groups --bootstrap-server localhost:9092 \
    --describe --group clickhouse-audit-traces-consumer

kubectl exec -it kafka-0 -n kafka -- \
  kafka-consumer-groups --bootstrap-server localhost:9092 \
    --describe --group clickhouse-audit-metrics-consumer
```

**Expected**: LAG column should be 0 or minimal

---

## Performance Validation

### Storage Efficiency

```bash
clickhouse-client --query="
SELECT
  table,
  formatReadableSize(sum(data_compressed_bytes)) as compressed,
  formatReadableSize(sum(data_uncompressed_bytes)) as uncompressed,
  round(sum(data_compressed_bytes) / sum(data_uncompressed_bytes), 2) as ratio
FROM system.parts
WHERE database = 'audit_db' AND active
GROUP BY table
FORMAT Vertical"
```

**Expected**: Compression ratio < 0.15 (due to CODEC optimization)

### Query Performance

```bash
# Test tenant filtering
clickhouse-client --query="
SELECT count()
FROM audit_db.otel_audit_logs
WHERE tenant_id = 'test-tenant'
AND date >= today() - 7
SETTINGS max_execution_time = 1"
```

**Expected**: Query completes in < 1 second

---

## Rollback

If needed, rollback the migration:

```bash
cd infrastructure/clickhouse
goose -dir migrations clickhouse "clickhouse://localhost:9000/default" down
```

This will:
1. Drop all materialized views
2. Drop all target tables
3. Drop all Kafka queue tables
4. Drop audit_db database

---

## Next Steps

1. **Configure OTEL Collector** to route audit data to `otel.audit.*` topics
2. **Update audit-service** to emit audit logs with proper attributes
3. **Implement POST_PHASE3_P4**: Frontend SDK for telemetry
4. **Create Grafana dashboards** for audit log visualization

---

## Troubleshooting

### Issue: No data in target tables

```bash
# Check if Kafka topics exist
kubectl exec -it kafka-0 -n kafka -- kafka-topics \
  --bootstrap-server localhost:9092 --list | grep audit

# Check if messages in topics
kubectl exec -it kafka-0 -n kafka -- kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic otel.audit.logs \
  --max-messages 1
```

### Issue: Consumer lag increasing

```bash
# Check ClickHouse errors
clickhouse-client --query="
SELECT * FROM system.errors
WHERE name LIKE '%Kafka%'
ORDER BY last_error_time DESC
LIMIT 10"

# Increase consumers if needed
ALTER TABLE audit_db.audit_logs_queue
MODIFY SETTING kafka_num_consumers = 4;
```

### Issue: High storage usage

```bash
# Check partition sizes
clickhouse-client --query="
SELECT
  partition,
  formatReadableSize(sum(bytes_on_disk)) as size,
  sum(rows) as rows
FROM system.parts
WHERE database = 'audit_db' AND table = 'otel_audit_logs'
GROUP BY partition
ORDER BY partition DESC
LIMIT 12"

# Verify TTL working
clickhouse-client --query="
SELECT
  partition,
  delete_ttl_info_min,
  delete_ttl_info_max
FROM system.parts
WHERE database = 'audit_db' AND table = 'otel_audit_logs'
LIMIT 5
FORMAT Vertical"
```

---

## Success Criteria

- ✅ All 9 tables created in audit_db
- ✅ Kafka consumers running (lag < 1000)
- ✅ Data flowing to target tables
- ✅ TTL configured correctly (7y/90d/1y)
- ✅ Compression ratio < 0.15
- ✅ Query performance < 1s for recent data
- ✅ Multi-tenant filtering working

---

**Completion**: This phase is complete when all success criteria are met and verified.
