# Observability Implementation Standards

> Implementation patterns for OTEL instrumentation | **Last Updated**: 2026-01-19

## Backend Services (NestJS)

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
```

**Required Environment Variables**:

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

**Decision**: Use OTLP/JSON for Kafka topics (not Protobuf)

**Rationale**:

- Human-readable: Easier debugging via `rpk topic consume`
- No schema files: Protobuf requires .proto file distribution
- JSONExtract: ClickHouse has native JSON functions
- Multi-language: All languages can parse JSON
- Size tradeoff: ~30% larger than Protobuf (acceptable with snappy compression)

### OTLP JSON Schema (Logs Example)

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
      max_message_bytes: 10000000
      required_acks: 1
      compression: snappy
```

## Monitoring Queries

```promql
# Kafka consumer lag
kafka_consumer_lag{topic=~"otel.*"} > 1000

# ClickHouse insertion rate
rate(clickhouse_inserted_rows_total{database="audit_db"}[5m]) < 100

# OTEL Collector export errors
rate(otelcol_exporter_send_failed_spans_total[5m]) > 0
```

## References

- [OTLP Specification 1.9.0](https://opentelemetry.io/docs/specs/otlp/)
- Main Policy: `observability-2026.md`
- ClickHouse: `observability-clickhouse.md`
