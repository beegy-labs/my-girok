# Observability ClickHouse Integration

> ClickHouse patterns for OTLP data storage and querying

## Overview

This document describes the ClickHouse integration patterns for storing and querying OpenTelemetry data. It covers the JSONAsString pattern, materialized views for JSON parsing, and optimal table designs for telemetry data.

## JSONAsString + JSONExtract Pattern

The recommended approach uses three layers: landing tables, materialized views for parsing, and target tables for querying.

### Landing Table (Kafka Engine)

The landing table receives raw OTLP JSON messages from Kafka:

```sql
CREATE TABLE IF NOT EXISTS audit_db.audit_logs_queue (
    raw String  -- Entire OTLP JSON message as string
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel.audit.logs',
    kafka_group_name = 'clickhouse-audit-logs-consumer',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576,
    kafka_skip_broken_messages = 10,
    kafka_sasl_mechanism = 'SCRAM-SHA-512',
    kafka_sasl_username = 'superuser',
    kafka_sasl_password = 'RedpandaSASL2024';
```

### Materialized View (JSON Parser)

The materialized view extracts structured data from the raw JSON:

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_logs
TO audit_db.otel_audit_logs
AS SELECT
    toDateTime64(
        toUInt64(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1,
            'logRecords', 1, 'timeUnixNano')) / 1000000000,
        9, 'UTC'
    ) as timestamp,

    JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1,
        'logRecords', 1, 'body', 'stringValue') as body,

    -- Extract resource attributes (find by key)
    JSONExtractString(
        arrayElement(
            arrayFilter(
                x -> JSONExtractString(x, 'key') = 'service.name',
                JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceLogs', 1,
                    'resource', 'attributes'))
            ),
            1
        ),
        'value', 'stringValue'
    ) as service_name,

    JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes')
        as resource_attributes,
    JSONExtractRaw(raw, 'resourceLogs', 1, 'scopeLogs', 1,
        'logRecords', 1, 'attributes') as log_attributes

FROM audit_db.audit_logs_queue;
```

### Target Table (MergeTree)

The target table stores parsed data with optimized indexes and TTL:

```sql
CREATE TABLE IF NOT EXISTS audit_db.otel_audit_logs (
    timestamp DateTime64(9, 'UTC') CODEC(Delta, ZSTD(1)),
    date Date MATERIALIZED toDate(timestamp),
    body String,
    service_name LowCardinality(String),
    tenant_id LowCardinality(String),
    resource_attributes String DEFAULT '{}',
    log_attributes String DEFAULT '{}',

    INDEX idx_tenant_id tenant_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service service_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_body body TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, tenant_id, service_name, timestamp)
TTL date + INTERVAL 7 YEAR DELETE
SETTINGS index_granularity = 8192;
```

## Tenant Queries

### Efficient Tenant Filtering

Use bloom filter indexes for fast tenant lookups:

```sql
-- Efficient tenant filtering (uses bloom filter)
SELECT count()
FROM audit_db.otel_audit_logs
WHERE tenant_id = 'tenant-abc'
AND date >= today() - 7;
```

### Multi-Tenant Aggregation

```sql
-- Multi-tenant aggregation
SELECT
    tenant_id,
    count() as log_count,
    uniqExact(service_name) as services
FROM audit_db.otel_audit_logs
WHERE date >= today() - 1
GROUP BY tenant_id
ORDER BY log_count DESC;
```

## Performance Optimization

### Compression Settings

```sql
-- Compression settings
SETTINGS
    index_granularity = 8192,
    min_bytes_for_wide_part = 10485760,
    min_rows_for_wide_part = 100000;
```

### Scaling Consumers

Increase consumers if Kafka lag exceeds 1000 messages:

```sql
-- Increase consumers if lag > 1000
ALTER TABLE audit_db.audit_logs_queue
MODIFY SETTING kafka_num_consumers = 4;
```

## Troubleshooting

### No Data in ClickHouse

When data is not appearing in ClickHouse tables:

```bash
# 1. Check Kafka has data
rpk topic consume otel.audit.logs --num 1

# 2. Check ClickHouse consumer
SELECT * FROM system.kafka_consumers WHERE table = 'audit_logs_queue';

# 3. Check errors
SELECT * FROM system.errors WHERE name LIKE '%Kafka%';
```

**Common Causes**:

- SASL credentials incorrect → Fix in Vault/ExternalSecrets
- Topic name mismatch → Verify `kafka_topic_list` setting
- JSON parsing error → Check JSONExtract syntax

## Kafka Topic Retention Settings

Configure Kafka topic retention to match data retention requirements:

```bash
# Logs: 7 years = 220752000000 ms
--config retention.ms=220752000000

# Traces: 90 days = 7776000000 ms
--config retention.ms=7776000000

# Metrics: 1 year = 31536000000 ms
--config retention.ms=31536000000
```

## Related Documentation

- [ClickHouse Kafka Engine](https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka)
- [ClickHouse JSON Functions](https://clickhouse.com/docs/en/sql-reference/functions/json-functions)
- [Altinity KB: JSONAsString Pattern](https://kb.altinity.com/altinity-kb-schema-design/altinity-kb-jsonasstring-and-mat.-view-as-json-parser/)
- Main Policy: `docs/en/policies/observability-2026.md`
- Implementation: `docs/en/policies/observability-implementation.md`

---

_This document is auto-generated from `docs/llm/policies/observability-clickhouse.md`_
