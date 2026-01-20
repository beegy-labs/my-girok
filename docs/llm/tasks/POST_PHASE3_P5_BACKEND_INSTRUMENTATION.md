# Post-Phase 3-P5: Backend Service Instrumentation

> **Status**: Completed ✅
> **Completed Date**: 2026-01-19
> **Priority**: P2 (Medium)
> **Dependencies**: Post-Phase 3-P1 (Audit Gateway)
> **Repository**: my-girok (packages/nest-common, services/\*)
> **Verification Guide**: [POST_PHASE3_P5_VERIFICATION.md](POST_PHASE3_P5_VERIFICATION.md)

---

## Objective

Integrate OpenTelemetry SDK in NestJS backend services to automatically instrument HTTP, gRPC, Prisma, and custom business logic.

### Architecture

```
Backend Service (NestJS)
┌────────────────────────────┐
│ @otel/sdk-node (automatic) │
│  - HTTP instrumentation    │
│  - Prisma instrumentation  │
│  - NestJS instrumentation  │
└──────────────┬─────────────┘
               │ HTTP POST (API Key)
               ▼
        ┌─────────────────┐
        │ audit-service   │
        │ (Gateway)       │
        └─────────────────┘
```

---

## Implementation

### 1. Create OTEL Module in nest-common

**File**: `packages/nest-common/src/otel/otel.module.ts`

```typescript
import { Module, DynamicModule, Global, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

@Global()
@Module({})
export class OtelModule implements OnModuleInit {
  private static sdk: NodeSDK;

  static forRoot(): DynamicModule {
    return {
      module: OtelModule,
      providers: [ConfigService],
      exports: [],
    };
  }

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const serviceName = this.configService.get<string>('SERVICE_NAME') || 'unknown-service';
    const serviceVersion = this.configService.get<string>('SERVICE_VERSION') || '1.0.0';
    const environment = this.configService.get<string>('NODE_ENV') || 'development';
    const collectorUrl = this.configService.get<string>('OTEL_COLLECTOR_URL');

    if (!collectorUrl) {
      console.warn('[OTEL] OTEL_COLLECTOR_URL not configured, skipping');
      return;
    }

    const resource = new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      'deployment.environment': environment,
    });

    const apiKey = this.configService.get<string>('AUDIT_API_KEY');

    const traceExporter = new OTLPTraceExporter({
      url: `${collectorUrl}/v1/telemetry/traces`,
      headers: {
        'x-api-key': apiKey,
        'x-tenant-id': 'system',
        'x-environment': environment,
      },
    });

    const metricExporter = new OTLPMetricExporter({
      url: `${collectorUrl}/v1/telemetry/metrics`,
      headers: {
        'x-api-key': apiKey,
        'x-tenant-id': 'system',
        'x-environment': environment,
      },
    });

    OtelModule.sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 60000,
      }),
      instrumentations: [
        new HttpInstrumentation(),
        new NestInstrumentation(),
        new PrismaInstrumentation(),
      ],
    });

    await OtelModule.sdk.start();
    console.log(`[OTEL] Instrumentation started for ${serviceName}`);
  }

  async onModuleDestroy() {
    if (OtelModule.sdk) {
      await OtelModule.sdk.shutdown();
    }
  }
}
```

### 2. Integrate in auth-service

**File**: `services/auth-service/src/app.module.ts`

```diff
 import { Module } from '@nestjs/common';
 import { ConfigModule } from '@nestjs/config';
+import { OtelModule } from '@my-girok/nest-common/otel';
 import { PrismaModule } from './shared/prisma/prisma.module';

 @Module({
   imports: [
+    OtelModule.forRoot(),
     ConfigModule.forRoot({ isGlobal: true }),
     PrismaModule,
     // ... other modules
   ],
 })
 export class AppModule {}
```

### 3. Environment Variables

**File**: `services/auth-service/.env.development`

```bash
SERVICE_NAME=auth-service
SERVICE_VERSION=1.0.0
NODE_ENV=development

# OTEL Configuration
OTEL_COLLECTOR_URL=http://localhost:3003
AUDIT_API_KEY=<local-dev-key>
```

**File**: Kubernetes ConfigMap/ExternalSecret

```yaml
# Add to platform-gitops ExternalSecret
- secretKey: OTEL_COLLECTOR_URL
  remoteRef:
    key: shared/otel
    property: collector_url
  # Value: http://audit-service.platform:3003

- secretKey: AUDIT_API_KEY
  remoteRef:
    key: shared/otel
    property: api_key
```

### 4. Custom Instrumentation

For business-critical operations, add manual spans:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class AdminAccountService {
  async createAdmin(dto: CreateAdminDto) {
    const tracer = trace.getTracer('auth-service');
    const span = tracer.startSpan('admin.create', {
      attributes: {
        'admin.email': dto.email,
        'admin.role_id': dto.roleId,
        'log.type': 'audit',
        'audit.compliance': true,
      },
    });

    try {
      const admin = await this.prisma.admin.create({ data: dto });
      span.setStatus({ code: SpanStatusCode.OK });
      return admin;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

---

## Verification

### Test Locally

```bash
# Start auth-service
pnpm --filter auth-service dev

# Make API call
curl -X POST http://localhost:4001/admin/admins \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","roleId":"role_xxx"}'

# Check audit-service logs for trace received
```

### Verify in ClickHouse

```sql
-- Check if backend traces are being received
SELECT
  count() as total_traces,
  uniqExact(service_name) as services
FROM audit_db.otel_audit_traces
WHERE service_name IN ('auth-service', 'audit-service')
  AND timestamp > now() - INTERVAL 1 HOUR;

-- Check recent backend spans
SELECT
  timestamp,
  service_name,
  span_name,
  duration_ns / 1000000 as duration_ms,
  status_code
FROM audit_db.otel_audit_traces
WHERE service_name = 'auth-service'
ORDER BY timestamp DESC
LIMIT 10;

-- Check audit-critical operations
SELECT
  timestamp,
  service_name,
  span_name,
  span_attributes['admin.email'] as admin_email
FROM audit_db.otel_audit_traces
WHERE span_name = 'admin.create'
  AND timestamp > now() - INTERVAL 1 DAY
ORDER BY timestamp DESC;
```

---

## Roll Out to Other Services

Apply same pattern to:

- ✅ `services/auth-service`
- ⬜ `services/audit-service`
- ⬜ `services/identity-service`
- ⬜ `services/authorization-service`
- ⬜ `services/analytics-service`

---

## Monitoring

### Key Metrics

```sql
-- Service health overview
SELECT
  service_name,
  count() as request_count,
  avg(duration_ns) / 1000000 as avg_duration_ms,
  quantile(0.95)(duration_ns / 1000000) as p95_duration_ms,
  countIf(status_code = 'ERROR') / count() * 100 as error_rate_percent
FROM audit_db.otel_audit_traces
WHERE timestamp > now() - INTERVAL 1 HOUR
GROUP BY service_name;

-- Top slow database queries
SELECT
  service_name,
  span_attributes['db.statement'] as query,
  count() as execution_count,
  avg(duration_ns) / 1000000 as avg_duration_ms
FROM audit_db.otel_audit_traces
WHERE span_name LIKE '%prisma%'
  AND timestamp > now() - INTERVAL 1 HOUR
GROUP BY service_name, query
ORDER BY avg_duration_ms DESC
LIMIT 10;
```

---

## Completion

### Checklist

- [ ] OtelModule created in nest-common
- [ ] auth-service instrumented
- [ ] Local testing verified
- [ ] Traces visible in ClickHouse
- [ ] Custom audit spans working
- [ ] Documentation updated

### Rollout Plan

1. **Week 1**: auth-service (pilot)
2. **Week 2**: audit-service, identity-service
3. **Week 3**: authorization-service, analytics-service

---

## Summary

Post-Phase 3 OTEL Pipeline Complete:

1. ✅ **P1**: Audit Gateway - Secure telemetry entry point
2. ✅ **P2**: OTEL Collector - Internal processing and Kafka export
3. ✅ **P3**: ClickHouse Kafka - Long-term storage with TTL
4. ✅ **P4**: Frontend SDK - Browser instrumentation
5. ✅ **P5**: Backend Instrumentation - Service instrumentation

**Result**: Complete observability pipeline with audit compliance.
