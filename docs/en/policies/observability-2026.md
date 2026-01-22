# Observability Policy - 2026

> Comprehensive observability standards using OpenTelemetry

## Overview

This policy defines the observability standards for all services in the my-girok platform. It establishes vendor-neutral telemetry practices using OpenTelemetry Protocol (OTLP) with Kafka-based buffering for data durability.

**Policy Version**: 1.0 | **Applies To**: All services

## Core Principles

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

The observability pipeline flows from applications through collection and storage:

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

Kafka (Redpanda) is required as an intermediate buffer for several critical reasons:

1. **Data Durability**: Replication (RF=3) ensures no data loss during outages
2. **Backpressure Handling**: Graceful degradation instead of data loss when downstream is slow
3. **Multi-Consumer Support**: ClickHouse now, with ability to add Elasticsearch/S3/Loki later
4. **Decoupling**: Independent component upgrades without system-wide coordination

## Retention Policies

### Audit Data (Compliance)

Audit data requires long-term retention for legal compliance:

| Signal  | Retention   | Partition | Reason                        |
| ------- | ----------- | --------- | ----------------------------- |
| Logs    | **7 years** | Monthly   | Legal compliance (GDPR, SOC2) |
| Traces  | **90 days** | Monthly   | Compliance audit trail        |
| Metrics | **1 year**  | Monthly   | SLA reporting                 |

### Operational Data (Debugging)

Operational data has shorter retention for cost efficiency:

| Signal  | Retention   | Partition | Reason               |
| ------- | ----------- | --------- | -------------------- |
| Logs    | **30 days** | Daily     | Hot debugging        |
| Traces  | **30 days** | Daily     | Performance analysis |
| Metrics | **90 days** | Daily     | Trending             |

## Multi-Tenancy Requirements

All telemetry **MUST include** `tenant.id` in attributes:

**Backend Services**:

```typescript
resourceAttributes: { 'tenant.id': 'tenant-uuid' }
```

**Frontend Applications**:

```typescript
exportHeaders: { 'x-tenant-id': 'tenant-uuid' }
```

## Security Standards

| Area           | Standard                                     |
| -------------- | -------------------------------------------- |
| Kafka          | SASL SCRAM-SHA-512                           |
| OTLP Endpoints | API key authentication (`x-api-key` header)  |
| ClickHouse     | User-based ACL (not `default` in production) |
| Transport      | TLS 1.3 for all inter-service communication  |
| PII            | Redaction in OTEL Collector processors       |
| Tenant         | Row-Level Security on `tenant_id`            |

## Service Level Objectives (SLOs)

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

## Related Documentation

| Topic          | Document                                           |
| -------------- | -------------------------------------------------- |
| Implementation | `docs/en/policies/observability-implementation.md` |
| ClickHouse     | `docs/en/policies/observability-clickhouse.md`     |
| Deployment     | `docs/en/guides/telemetry-gateway-deployment.md`   |

## External References

- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/)
- [OTLP Protocol 1.9.0](https://opentelemetry.io/docs/specs/otlp/)
- [ClickHouse: Best Practices for OTLP](https://clickhouse.com/resources/engineering/best-resources-storing-opentelemetry-collector-data)

---

**Policy Owner**: Platform Team | **Review Cycle**: Quarterly

_This document is auto-generated from `docs/llm/policies/observability-2026.md`_
