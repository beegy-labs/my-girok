# Observability Policy - 2026

> **Policy Version**: 1.0 | **Last Updated**: 2026-01-19 | **Applies To**: All services

## Principles

1. **Standard Compliance**: Use OpenTelemetry Protocol (OTLP) exclusively
2. **Vendor Neutrality**: Architecture supports any OTLP-compatible backend
3. **Data Durability**: Kafka buffering for replay and 7-year audit retention
4. **Fault Isolation**: Component failures must not cause data loss
5. **Multi-Tenancy**: All telemetry must include tenant context

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

## Pipeline Architecture

```
Application Layer (Frontend, Backend, Mobile)
         │ OTLP/HTTP (4318) or gRPC (4317)
         ▼
OpenTelemetry Collector
├── Receivers (OTLP)
├── Processors (k8sattributes, batch, memory_limiter)
└── Exporters (Kafka, OTLP JSON, snappy compression)
         │
         ▼
Apache Kafka (Redpanda)
├── otel.audit.logs    (7y retention)
├── otel.audit.traces  (90d retention)
├── otel.audit.metrics (1y retention)
├── otel.logs          (30d retention)
├── otel.traces        (30d retention)
└── otel.metrics       (90d retention)
         │
         ▼
ClickHouse
├── Kafka Engine Tables (JSONAsString)
├── Materialized Views (JSONExtract parsing)
└── Target Tables (MergeTree, TTL policies)
```

## Why Kafka is Mandatory

1. **Data Durability**: Replication (RF=3) ensures no data loss
2. **Backpressure**: Graceful degradation vs. data loss
3. **Multi-Consumer**: ClickHouse now, Elasticsearch/S3/Loki later
4. **Decoupling**: Independent component upgrades

## Retention Policies

### Audit Data (Compliance)

| Signal  | Retention   | Partition | Reason                        |
| ------- | ----------- | --------- | ----------------------------- |
| Logs    | **7 years** | Monthly   | Legal compliance (GDPR, SOC2) |
| Traces  | **90 days** | Monthly   | Compliance audit trail        |
| Metrics | **1 year**  | Monthly   | SLA reporting                 |

### Operational Data (Debugging)

| Signal  | Retention   | Partition | Reason               |
| ------- | ----------- | --------- | -------------------- |
| Logs    | **30 days** | Daily     | Hot debugging        |
| Traces  | **30 days** | Daily     | Performance analysis |
| Metrics | **90 days** | Daily     | Trending             |

## Multi-Tenancy

**MUST include** `tenant.id` in all telemetry:

```typescript
// Backend
resourceAttributes: { 'tenant.id': 'tenant-uuid' }

// Frontend
exportHeaders: { 'x-tenant-id': 'tenant-uuid' }
```

## Security

| Area           | Standard                                     |
| -------------- | -------------------------------------------- |
| Kafka          | SASL SCRAM-SHA-512                           |
| OTLP Endpoints | API key authentication (`x-api-key` header)  |
| ClickHouse     | User-based ACL (not `default` in production) |
| Transport      | TLS 1.3 for all inter-service communication  |
| PII            | Redaction in OTEL Collector processors       |
| Tenant         | Row-Level Security on `tenant_id`            |

## SLOs

| Metric            | Target         | Alert Threshold |
| ----------------- | -------------- | --------------- |
| Consumer Lag      | < 100 messages | > 1000          |
| Query P95 Latency | < 1s           | > 5s            |
| Data Loss Rate    | 0%             | > 0.01%         |
| Collector CPU     | < 500m         | > 800m          |

## Migration Phases

1. **Phase 1**: Core services (audit, auth) - COMPLETE
2. **Phase 2**: All backend services
3. **Phase 3**: Frontend applications
4. **Phase 4**: Mobile applications

## Related Documents

| Topic          | Document                                 |
| -------------- | ---------------------------------------- |
| Implementation | `observability-implementation.md`        |
| ClickHouse     | `observability-clickhouse.md`            |
| Deployment     | `guides/telemetry-gateway-deployment.md` |

## References

- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/)
- [OTLP Protocol 1.9.0](https://opentelemetry.io/docs/specs/otlp/)
- [ClickHouse: Best Practices for OTLP](https://clickhouse.com/resources/engineering/best-resources-storing-opentelemetry-collector-data)

---

**Policy Owner**: Platform Team | **Review Cycle**: Quarterly
