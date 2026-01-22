# Observability Implementation Standards

> Implementation patterns for OTEL instrumentation across all platforms

## Overview

This document provides implementation standards for OpenTelemetry (OTEL) instrumentation in backend services, frontend applications, and mobile apps. It covers SDK configuration, environment variables, and data format decisions.

## Backend Services (NestJS)

### Initialization Order

**CRITICAL**: OTEL initialization MUST be the first import in `main.ts`. This ensures all subsequent modules are properly instrumented.

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
```

### Required Environment Variables

Configure these environment variables in your Kubernetes deployment:

```yaml
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: 'http://otel-collector.monitoring:4318'
  - name: OTEL_SERVICE_NAME
    value: 'auth-service'
  - name: OTEL_DEBUG
    value: 'false'
  - name: OTEL_TRACES_SAMPLER_ARG
    value: '1.0' # 100% sampling (adjust for production)
```

## Frontend Applications (React)

### SDK Configuration

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

### Sampling Recommendations

| Application Type | Sampling Ratio | Rationale                    |
| ---------------- | -------------- | ---------------------------- |
| Admin panels     | 1.0 (100%)     | Low traffic, full visibility |
| User-facing apps | 0.1 (10%)      | High traffic, cost control   |
| Development      | 1.0 (100%)     | Full debugging capability    |

## Mobile Applications

### iOS (Swift)

```swift
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

### Android (Kotlin)

```kotlin
val config = OtelConfig(
    serviceName = "android-app",
    endpoint = "https://audit.girok.dev/v1",
    headers = mapOf(
        "x-api-key" to apiKey,
        "x-tenant-id" to tenantId
    )
)
OpenTelemetry.initialize(config)
```

## OTLP JSON Data Format

### Decision

Use OTLP/JSON for Kafka topics instead of Protobuf.

### Rationale

| Factor         | JSON                                 | Protobuf        |
| -------------- | ------------------------------------ | --------------- |
| Readability    | Human-readable, easy debugging       | Binary, opaque  |
| Schema         | No .proto files needed               | Requires schema |
| ClickHouse     | Native JSONExtract functions         | Needs decoding  |
| Multi-language | All languages parse JSON             | Needs codegen   |
| Size           | ~30% larger (acceptable with snappy) | More compact    |

### OTLP JSON Schema Example (Logs)

```json
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          { "key": "service.name", "value": { "stringValue": "auth-service" } },
          { "key": "tenant.id", "value": { "stringValue": "tenant-uuid" } }
        ]
      },
      "scopeLogs": [
        {
          "scope": { "name": "@my-girok/nest-common", "version": "1.0.0" },
          "logRecords": [
            {
              "timeUnixNano": "1737328347000000000",
              "severityNumber": 9,
              "severityText": "INFO",
              "body": { "stringValue": "User login successful" },
              "attributes": [
                { "key": "user.id", "value": { "stringValue": "user-uuid" } },
                { "key": "log.type", "value": { "stringValue": "audit" } }
              ],
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

## OTEL Collector Configuration

### Processor Configuration

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
```

### Kafka Exporter Configuration

```yaml
exporters:
  kafka/logs:
    brokers:
      - kafka.girok.dev:9093
    topic: otel.audit.logs
    encoding: otlp_json
    producer:
      max_message_bytes: 10000000
      required_acks: 1
      compression: snappy
```

## Monitoring Queries

Use these Prometheus queries to monitor the observability pipeline:

```promql
# Kafka consumer lag
kafka_consumer_lag{topic=~"otel.*"} > 1000

# ClickHouse insertion rate
rate(clickhouse_inserted_rows_total{database="audit_db"}[5m]) < 100

# OTEL Collector export errors
rate(otelcol_exporter_send_failed_spans_total[5m]) > 0
```

## Checklist for New Services

When adding observability to a new service:

- [ ] Add `initOtel()` as first import in main.ts
- [ ] Configure environment variables in Helm values
- [ ] Set appropriate sampling ratio
- [ ] Include `tenant.id` in resource attributes
- [ ] Verify data appears in ClickHouse
- [ ] Add service to Grafana dashboards

## Related Documentation

- [OTLP Specification 1.9.0](https://opentelemetry.io/docs/specs/otlp/)
- Main Policy: `docs/en/policies/observability-2026.md`
- ClickHouse: `docs/en/policies/observability-clickhouse.md`

---

_This document is auto-generated from `docs/llm/policies/observability-implementation.md`_
