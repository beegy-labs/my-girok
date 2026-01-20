# Observability & OpenTelemetry - 2026 Enterprise Best Practices

> **Policy Version**: 1.0
> **Last Updated**: 2026-01-19
> **Status**: Active
> **Applies To**: All services, frontend applications

---

## Overview

This document defines the enterprise-grade observability architecture and OpenTelemetry (OTEL) best practices for the my-girok platform, based on 2026 industry standards.

### Principles

1. **Standard Compliance**: Use OpenTelemetry Protocol (OTLP) exclusively - no proprietary formats
2. **Vendor Neutrality**: Architecture must support any OTLP-compatible backend
3. **Data Durability**: Kafka buffering for replay and 7-year audit retention
4. **Fault Isolation**: Component failures must not cause data loss
5. **Multi-Tenancy**: All telemetry must include tenant context for isolation

---

## Architecture

### Standard Pipeline (2026)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Enterprise OTEL Pipeline                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Application Layer                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │  Frontend   │  │  Backend    │  │  Mobile     │                     │
│  │  (Browser)  │  │  (Node.js)  │  │ (iOS/Andr.) │                     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                     │
│         │                 │                 │                            │
│         │ OTLP/HTTP       │ OTLP/HTTP      │ OTLP/gRPC                 │
│         │ (4318)          │ (4318)          │ (4317)                    │
│         └────────────────────┴──────────────────┘                        │
│                              │                                           │
│  Collection Layer            ↓                                           │
│  ┌─────────────────────────────────────────┐                            │
│  │     OpenTelemetry Collector             │                            │
│  │  ┌──────────────────────────────────┐   │                            │
│  │  │  Receivers (OTLP)                │   │                            │
│  │  └───────────────┬──────────────────┘   │                            │
│  │  ┌───────────────▼──────────────────┐   │                            │
│  │  │  Processors                      │   │                            │
│  │  │  - k8sattributes (enrich)        │   │                            │
│  │  │  - batch (optimize throughput)   │   │                            │
│  │  │  - memory_limiter (backpressure) │   │                            │
│  │  │  - resource detection            │   │                            │
│  │  └───────────────┬──────────────────┘   │                            │
│  │  ┌───────────────▼──────────────────┐   │                            │
│  │  │  Exporters (Kafka)               │   │                            │
│  │  │  - OTLP JSON encoding            │   │                            │
│  │  │  - SASL SCRAM-SHA-512 auth       │   │                            │
│  │  │  - Compression (snappy)          │   │                            │
│  │  └───────────────┬──────────────────┘   │                            │
│  └──────────────────┼──────────────────────┘                            │
│                     │                                                    │
│  Buffering Layer    ↓                                                    │
│  ┌──────────────────────────────────────┐                               │
│  │         Apache Kafka (Redpanda)      │                               │
│  │  ┌────────────────────────────────┐  │                               │
│  │  │  Topics (OTLP JSON)            │  │                               │
│  │  │  - otel.audit.logs    (7y)     │  │                               │
│  │  │  - otel.audit.traces  (90d)    │  │                               │
│  │  │  - otel.audit.metrics (1y)     │  │                               │
│  │  │  - otel.logs          (30d)    │  │                               │
│  │  │  - otel.traces        (30d)    │  │                               │
│  │  │  - otel.metrics       (90d)    │  │                               │
│  │  └────────────────┬───────────────┘  │                               │
│  │                   │ Consumer Groups  │                               │
│  └───────────────────┼──────────────────┘                               │
│                      │                                                   │
│  Storage Layer       ↓                                                   │
│  ┌──────────────────────────────────────┐                               │
│  │         ClickHouse                   │                               │
│  │  ┌────────────────────────────────┐  │                               │
│  │  │  Kafka Engine Tables           │  │                               │
│  │  │  (JSONAsString format)         │  │                               │
│  │  └────────────┬───────────────────┘  │                               │
│  │  ┌────────────▼───────────────────┐  │                               │
│  │  │  Materialized Views            │  │                               │
│  │  │  (JSONExtract parsing)         │  │                               │
│  │  └────────────┬───────────────────┘  │                               │
│  │  ┌────────────▼───────────────────┐  │                               │
│  │  │  Target Tables (MergeTree)     │  │                               │
│  │  │  - Partitioned by month        │  │                               │
│  │  │  - Indexed (bloom filters)     │  │                               │
│  │  │  - Compressed (Delta + ZSTD)   │  │                               │
│  │  │  - TTL policies applied        │  │                               │
│  │  └────────────────────────────────┘  │                               │
│  └──────────────────────────────────────┘                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Why Kafka is Mandatory (Not Optional)

**Enterprise Requirements Met**:

1. **Data Durability**:
   - Kafka replication (RF=3) ensures no data loss
   - Audit compliance: 7-year retention requires replay capability
   - ClickHouse downtime = buffered in Kafka, zero data loss

2. **Backpressure Management**:
   - OTEL Collector can slow down if Kafka has space
   - Prevents service degradation during telemetry spikes
   - Graceful degradation vs. data loss

3. **Multi-Consumer Architecture**:
   - Current: ClickHouse
   - Future: Elasticsearch (full-text search), S3 (cold storage), Grafana Loki
   - One pipeline, multiple consumers

4. **Decoupling**:
   - OTEL Collector ↔ Storage are independent
   - Can upgrade ClickHouse without redeploying collectors
   - Can test new storage backends without disrupting collection

**Industry References**:

- [ClickHouse: Best Practices for Storing OTLP Data](https://clickhouse.com/resources/engineering/best-resources-storing-opentelemetry-collector-data)
- [Building Production-Grade Observability with Kafka](https://www.glassflow.dev/blog/building-observability-stack-with-opentelemetry-and-kafka)
- [SigNoz Architecture (YC-backed, uses Kafka)](https://signoz.io/docs/architecture/)

---

## Technology Stack

| Component         | Technology                      | Version | Purpose                  |
| ----------------- | ------------------------------- | ------- | ------------------------ |
| **SDK**           | `@opentelemetry/sdk-node`       | 0.58+   | Backend instrumentation  |
| **SDK**           | `@opentelemetry/sdk-trace-web`  | 1.30+   | Frontend instrumentation |
| **Protocol**      | OTLP/HTTP                       | 1.9.0+  | Standard wire format     |
| **Collector**     | OpenTelemetry Collector Contrib | 0.138+  | Telemetry aggregation    |
| **Message Queue** | Redpanda (Kafka-compatible)     | 25.3+   | Buffering & durability   |
| **Storage**       | ClickHouse                      | 24.12+  | Analytics database       |
| **Visualization** | Grafana                         | 11+     | Dashboards & alerts      |

---

## Implementation Standards

### Backend Services (NestJS)

**CRITICAL**: OTEL initialization MUST be the first import in `main.ts`:

```typescript
// services/*/src/main.ts

// MUST BE FIRST - before any other imports
import { initOtel } from '@my-girok/nest-common';
initOtel({
  serviceName: 'auth-service',
  exportHeaders: {
    'x-api-key': process.env.AUDIT_API_KEY || '',
    'x-tenant-id': 'system',
  },
});

// Then other imports
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// ...
```

**Required Environment Variables**:

```yaml
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: 'http://otel-collector.monitoring:4318'
  - name: OTEL_SERVICE_NAME
    value: 'auth-service'
  # Optional
  - name: OTEL_DEBUG
    value: 'false'
  - name: OTEL_TRACES_SAMPLER_ARG
    value: '1.0' # 100% sampling (adjust for production)
```

### Frontend Applications (React)

```typescript
// apps/web-girok/src/lib/otel.ts
import { initOtel } from '@my-girok/otel-web-sdk';

initOtel({
  serviceName: 'web-girok',
  endpoint: 'https://audit.girok.dev/v1',
  apiKey: import.meta.env.VITE_AUDIT_API_KEY,
  tenantId: 'tenant-123',
  samplingRatio: 0.1, // 10% for high-traffic apps
});
```

### Mobile Applications (iOS/Android)

```swift
// iOS (Swift)
import OpenTelemetryApi
import OpenTelemetrySdk

let config = OtelConfig(
    serviceName: "ios-app",
    endpoint: "https://audit.girok.dev/v1",
    headers: [
        "x-api-key": apiKey,
        "x-tenant-id": tenantId
    ]
)
OpenTelemetry.initialize(config: config)
```

---

## Data Format: OTLP JSON

### Why OTLP JSON (Not Protobuf)?

**Decision**: Use OTLP/JSON for Kafka topics

**Rationale**:

1. ✅ **Human-readable**: Easier debugging via `rpk topic consume`
2. ✅ **No schema files**: Protobuf requires .proto file distribution
3. ✅ **JSONExtract compatibility**: ClickHouse has native JSON functions
4. ✅ **Multi-language support**: All languages can parse JSON
5. ⚠️ **Size tradeoff**: ~30% larger than Protobuf, acceptable with compression

**Compression**: Use `snappy` compression in Kafka producer (balances CPU vs. size)

### OTLP JSON Schema (Logs Example)

```json
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          { "key": "service.name", "value": { "stringValue": "auth-service" } },
          { "key": "service.version", "value": { "stringValue": "1.2.3" } },
          { "key": "deployment.environment.name", "value": { "stringValue": "production" } },
          { "key": "k8s.namespace.name", "value": { "stringValue": "prod-my-girok" } },
          { "key": "k8s.pod.name", "value": { "stringValue": "auth-service-abc123" } },
          { "key": "tenant.id", "value": { "stringValue": "tenant-uuid" } }
        ]
      },
      "scopeLogs": [
        {
          "scope": {
            "name": "@my-girok/nest-common",
            "version": "1.0.0"
          },
          "logRecords": [
            {
              "timeUnixNano": "1737328347000000000",
              "observedTimeUnixNano": "1737328347100000000",
              "severityNumber": 9,
              "severityText": "INFO",
              "body": {
                "stringValue": "User login successful"
              },
              "attributes": [
                { "key": "user.id", "value": { "stringValue": "user-uuid" } },
                { "key": "log.type", "value": { "stringValue": "audit" } },
                { "key": "audit.compliance", "value": { "boolValue": true } }
              ],
              "traceId": "0102030405060708090a0b0c0d0e0f10",
              "spanId": "0102030405060708",
              "flags": 1
            }
          ]
        }
      ]
    }
  ]
}
```

**Reference**: [OTLP Specification 1.9.0](https://opentelemetry.io/docs/specs/otlp/)

---

## ClickHouse Integration Pattern

### JSONAsString + JSONExtract (Standard Pattern)

**Landing Table (Kafka Engine)**:

```sql
CREATE TABLE IF NOT EXISTS audit_db.audit_logs_queue (
    raw String  -- Entire OTLP JSON message as string
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka.girok.dev:9093',
    kafka_topic_list = 'otel.audit.logs',
    kafka_group_name = 'clickhouse-audit-logs-consumer',
    kafka_format = 'JSONAsString',  -- Read entire message as one string
    kafka_num_consumers = 2,
    kafka_max_block_size = 1048576,
    kafka_skip_broken_messages = 10,
    kafka_sasl_mechanism = 'SCRAM-SHA-512',
    kafka_sasl_username = 'superuser',
    kafka_sasl_password = 'RedpandaSASL2024';
```

**Materialized View (JSON Parser)**:

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_db.mv_audit_logs
TO audit_db.otel_audit_logs
AS SELECT
    -- Extract nested fields using JSONExtract
    toDateTime64(
        toUInt64(JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'timeUnixNano')) / 1000000000,
        9, 'UTC'
    ) as timestamp,

    JSONExtractString(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'body', 'stringValue') as body,

    -- Extract resource attributes (find by key)
    JSONExtractString(
        arrayElement(
            arrayFilter(
                x -> JSONExtractString(x, 'key') = 'service.name',
                JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes'))
            ),
            1
        ),
        'value', 'stringValue'
    ) as service_name,

    -- Store full JSON for replay/debugging
    JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes') as resource_attributes,
    JSONExtractRaw(raw, 'resourceLogs', 1, 'scopeLogs', 1, 'logRecords', 1, 'attributes') as log_attributes

FROM audit_db.audit_logs_queue;
```

**Target Table (MergeTree)**:

```sql
CREATE TABLE IF NOT EXISTS audit_db.otel_audit_logs (
    timestamp DateTime64(9, 'UTC') CODEC(Delta, ZSTD(1)),
    date Date MATERIALIZED toDate(timestamp),  -- Auto-partitioning key
    body String,
    service_name LowCardinality(String),
    tenant_id LowCardinality(String),

    -- Store full attributes as JSON for flexibility
    resource_attributes String DEFAULT '{}',
    log_attributes String DEFAULT '{}',

    -- Indexes for fast queries
    INDEX idx_tenant_id tenant_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service service_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_body body TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, tenant_id, service_name, timestamp)
TTL date + INTERVAL 7 YEAR DELETE
SETTINGS index_granularity = 8192;
```

**References**:

- [ClickHouse: JSON Extraction Guide](https://clickhouse.com/docs/knowledgebase/json_simple_example)
- [Altinity KB: JSONAsString Parser Pattern](https://kb.altinity.com/altinity-kb-schema-design/altinity-kb-jsonasstring-and-mat.-view-as-json-parser/)

---

## Retention Policies

### Audit Data (Long-term Compliance)

| Signal  | Retention   | Partition | Reason                        |
| ------- | ----------- | --------- | ----------------------------- |
| Logs    | **7 years** | Monthly   | Legal compliance (GDPR, SOC2) |
| Traces  | **90 days** | Monthly   | Compliance audit trail        |
| Metrics | **1 year**  | Monthly   | SLA reporting                 |

**Kafka Topic Settings**:

```bash
# Logs: 7 years = 220752000000 ms
--config retention.ms=220752000000

# Traces: 90 days = 7776000000 ms
--config retention.ms=7776000000

# Metrics: 1 year = 31536000000 ms
--config retention.ms=31536000000
```

**ClickHouse TTL**:

```sql
TTL date + INTERVAL 7 YEAR DELETE
```

### Operational Data (Short-term Debugging)

| Signal  | Retention   | Partition | Reason               |
| ------- | ----------- | --------- | -------------------- |
| Logs    | **30 days** | Daily     | Hot debugging        |
| Traces  | **30 days** | Daily     | Performance analysis |
| Metrics | **90 days** | Daily     | Trending             |

---

## Multi-Tenancy

### Tenant Isolation Requirements

**MUST include** `tenant.id` in all telemetry:

```typescript
// Backend (Resource attribute)
resourceAttributes: {
  'tenant.id': 'tenant-uuid',
}

// Frontend (via API key)
exportHeaders: {
  'x-tenant-id': 'tenant-uuid',
}
```

### ClickHouse Tenant Queries

```sql
-- Efficient tenant filtering (uses bloom filter)
SELECT count()
FROM audit_db.otel_audit_logs
WHERE tenant_id = 'tenant-abc'
AND date >= today() - 7;

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

---

## Performance Tuning

### OTEL Collector Configuration

```yaml
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048

  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  kafka/logs:
    brokers:
      - kafka.girok.dev:9093
    topic: otel.audit.logs
    encoding: otlp_json
    producer:
      max_message_bytes: 10000000 # 10MB (for Prometheus federation)
      required_acks: 1 # Balance: durability vs. latency
      compression: snappy # Fast compression
```

### ClickHouse Optimization

```sql
-- Compression settings
SETTINGS
    index_granularity = 8192,  -- Default, good for most cases
    min_bytes_for_wide_part = 10485760,  -- 10MB before wide parts
    min_rows_for_wide_part = 100000;

-- Consumer tuning
ALTER TABLE audit_db.audit_logs_queue
MODIFY SETTING kafka_num_consumers = 4;  -- Increase if lag > 1000
```

---

## Monitoring & Alerts

### Key Metrics

```promql
# Kafka consumer lag
kafka_consumer_lag{topic=~"otel.*"} > 1000

# ClickHouse insertion rate
rate(clickhouse_inserted_rows_total{database="audit_db"}[5m]) < 100

# OTEL Collector export errors
rate(otelcol_exporter_send_failed_spans_total[5m]) > 0
```

### SLOs

| Metric            | Target         | Alert Threshold |
| ----------------- | -------------- | --------------- |
| Consumer Lag      | < 100 messages | > 1000          |
| Query P95 Latency | < 1s           | > 5s            |
| Data Loss Rate    | 0%             | > 0.01%         |
| Collector CPU     | < 500m         | > 800m          |

---

## Security

### Authentication

- **Kafka**: SASL SCRAM-SHA-512 (no plaintext passwords in configs)
- **OTLP Endpoints**: API key authentication (`x-api-key` header)
- **ClickHouse**: User-based access control (not `default` user in production)

### Data Privacy

- **PII Redaction**: Implement in OTEL Collector processors (not storage)
- **Tenant Isolation**: Enforce `tenant_id` in all queries via Row-Level Security
- **Encryption**: TLS 1.3 for all inter-service communication

---

## Migration Strategy

### Phased Rollout

1. **Phase 1**: Core services (audit, auth) - COMPLETE
2. **Phase 2**: All backend services
3. **Phase 3**: Frontend applications
4. **Phase 4**: Mobile applications

### Zero-Downtime Migration

```bash
# 1. Deploy new tables (migration 007)
goose up

# 2. Run dual-write (old + new format) for 24h
# 3. Verify new tables have data
# 4. Switch read queries to new tables
# 5. Drop old tables after 7-day grace period
```

---

## Troubleshooting

### Issue: No Data in ClickHouse

**Diagnosis**:

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

---

## References

### Official Documentation

- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/)
- [OTLP Protocol 1.9.0](https://opentelemetry.io/docs/specs/otlp/)
- [ClickHouse Kafka Engine](https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka)
- [ClickHouse JSON Functions](https://clickhouse.com/docs/en/sql-reference/functions/json-functions)

### Best Practices

- [ClickHouse: Best Practices for OTLP Data](https://clickhouse.com/resources/engineering/best-resources-storing-opentelemetry-collector-data)
- [Building Production-Grade Observability](https://medium.com/@ShiveeGupta/building-a-production-grade-observability-platform-with-signoz-clickhouse-and-opentelemetry-d7f09a5250f5)
- [Observability Stack with Kafka](https://www.glassflow.dev/blog/building-observability-stack-with-opentelemetry-and-kafka)
- [Altinity KB: JSONAsString Pattern](https://kb.altinity.com/altinity-kb-schema-design/altinity-kb-jsonasstring-and-mat.-view-as-json-parser/)

### Related Documents

- [Telemetry Gateway Deployment Guide](../guides/telemetry-gateway-deployment.md)
- [POST_PHASE3 Task Status](../tasks/POST_PHASE3_STATUS.md)
- [Database Policy](database.md)

---

**Policy Owner**: Platform Team
**Review Cycle**: Quarterly
**Last Review**: 2026-01-19
