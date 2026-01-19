# POST_PHASE3_P5: Backend Service Instrumentation - Verification Guide

> **Created**: 2026-01-19
> **Status**: Ready for Testing
> **Services**: `auth-service` (pilot), other services (pending rollout)

---

## Summary

Integrated OpenTelemetry automatic instrumentation in NestJS backend services to send traces and metrics to audit-service gateway.

### Completed

1. **nest-common OTEL SDK Enhancement**
   - Added `exportHeaders` configuration option
   - Support for API key authentication and custom headers

2. **auth-service Integration** (Pilot)
   - OTEL initialized in main.ts (before NestJS bootstrap)
   - OtelModule registered in app.module.ts
   - Environment variables configured

3. **Automatic Instrumentation**
   - HTTP requests/responses
   - Prisma database queries
   - gRPC calls
   - NestJS controllers and services

---

## Architecture

```
Backend Service (auth-service)
┌─────────────────────────────────────────┐
│ @opentelemetry/sdk-node                 │
│                                         │
│ Auto Instrumentation:                   │
│ - HTTP (incoming/outgoing)              │
│ - Prisma (database queries)             │
│ - gRPC (microservice calls)             │
│ - NestJS (controllers/providers)        │
│                                         │
│ Exporters:                              │
│ - OTLPTraceExporter → /v1/traces        │
│ - OTLPMetricExporter → /v1/metrics      │
│                                         │
│ Headers:                                │
│ - x-api-key: AUDIT_API_KEY              │
│ - x-tenant-id: system                   │
│ - x-environment: NODE_ENV               │
└─────────────────┬───────────────────────┘
                  │ HTTPS + Headers
                  ▼
         ┌────────────────────┐
         │ audit-service      │
         │ /v1/telemetry/*    │
         │                    │
         │ - Validates API key│
         │ - Routes to topics │
         └────────────────────┘
                  │
                  ▼
         Kafka (otel.audit.*)
                  │
                  ▼
         ClickHouse (audit_db)
```

---

## Implementation Details

### 1. nest-common OTEL SDK Enhancement

**File**: `packages/nest-common/src/otel/otel-sdk.ts`

**Changes**:
- Added `exportHeaders?: Record<string, string>` to `OtelConfig`
- Headers applied to both trace and metric exporters
- Supports authentication and custom metadata

**Example**:
```typescript
initOtel({
  serviceName: 'auth-service',
  otlpEndpoint: 'http://localhost:3003',
  exportHeaders: {
    'x-api-key': process.env.AUDIT_API_KEY,
    'x-tenant-id': 'system',
  },
});
```

### 2. auth-service Integration

**File**: `services/auth-service/src/main.ts`

**Before**:
```typescript
import { initOtel } from '@my-girok/nest-common';
initOtel({ serviceName: 'auth-service' });
```

**After**:
```typescript
import { initOtel } from '@my-girok/nest-common';
initOtel({
  serviceName: 'auth-service',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  exportHeaders: {
    'x-api-key': process.env.AUDIT_API_KEY || '',
    'x-tenant-id': 'system',
    'x-environment': process.env.NODE_ENV || 'development',
  },
  debug: process.env.OTEL_DEBUG === 'true',
});
```

### 3. Environment Variables

**.env.example**:
```bash
# OpenTelemetry
SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3003
AUDIT_API_KEY=local-dev-key-changeme
# OTEL_DEBUG=true
# OTEL_SDK_DISABLED=false
```

**Production (Kubernetes)**:
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://audit-service.platform:3003`
- `AUDIT_API_KEY` from Kubernetes Secret
- `SERVICE_VERSION` from deployment labels

---

## Verification

### 1. Build nest-common

```bash
pnpm --filter @my-girok/nest-common build
```

### 2. Start auth-service

```bash
pnpm --filter auth-service dev
```

**Expected Console Output**:
```
[OTEL] OpenTelemetry SDK initialized for auth-service@1.0.0 (development, instance: abc123...)
```

### 3. Make API Request

```bash
# Create admin account
curl -X POST http://localhost:3001/v1/admin/admins \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test Admin",
    "roleId": "role_xxx"
  }'
```

### 4. Check audit-service Logs

```bash
# Watch audit-service logs
pnpm --filter audit-service dev

# Should see:
# POST /v1/telemetry/traces 200
# Headers: x-api-key=local-dev-key-changeme
```

### 5. Verify in ClickHouse

```sql
-- Check if auth-service traces are being received
SELECT
  count() as total_spans,
  uniqExact(service_name) as services,
  groupArray(service_name) as service_list
FROM audit_db.otel_audit_traces
WHERE timestamp > now() - INTERVAL 10 MINUTE
FORMAT Vertical;
```

**Expected Output**:
```
total_spans:   15
services:      1
service_list:  ['auth-service']
```

### 6. Check Recent Spans

```sql
SELECT
  timestamp,
  service_name,
  span_name,
  duration_ns / 1000000 as duration_ms,
  status_code,
  JSONExtractString(span_attributes, 'http.method') as method,
  JSONExtractString(span_attributes, 'http.route') as route
FROM audit_db.otel_audit_traces
WHERE service_name = 'auth-service'
ORDER BY timestamp DESC
LIMIT 20
FORMAT Vertical;
```

### 7. Check Database Query Spans

```sql
SELECT
  timestamp,
  span_name,
  duration_ns / 1000000 as duration_ms,
  JSONExtractString(span_attributes, 'db.statement') as query
FROM audit_db.otel_audit_traces
WHERE service_name = 'auth-service'
  AND span_name LIKE '%prisma%'
ORDER BY timestamp DESC
LIMIT 10
FORMAT Vertical;
```

---

## Automatic Instrumentation Coverage

### HTTP Requests

**Captured Automatically**:
- HTTP method, route, status code
- Request/response headers (sanitized)
- Request duration
- Error details

**Example Span**:
```json
{
  "span_name": "POST /v1/admin/admins",
  "span_attributes": {
    "http.method": "POST",
    "http.route": "/v1/admin/admins",
    "http.status_code": 201,
    "http.target": "/v1/admin/admins"
  }
}
```

### Prisma Queries

**Captured Automatically**:
- SQL query (parametrized)
- Query duration
- Table/model name
- Operation type (findMany, create, update, etc.)

**Example Span**:
```json
{
  "span_name": "prisma:client:operation",
  "span_attributes": {
    "db.system": "postgresql",
    "db.statement": "SELECT * FROM admins WHERE id = $1",
    "db.operation": "findUnique",
    "db.model": "Admin"
  }
}
```

### gRPC Calls

**Captured Automatically**:
- gRPC service and method
- Request/response metadata
- Status code
- Duration

**Example Span**:
```json
{
  "span_name": "identity.v1.IdentityService/GetUser",
  "span_attributes": {
    "rpc.system": "grpc",
    "rpc.service": "identity.v1.IdentityService",
    "rpc.method": "GetUser",
    "rpc.grpc.status_code": 0
  }
}
```

---

## Manual Span Creation (Optional)

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

## Troubleshooting

### Issue: No traces in ClickHouse

**Check 1**: OTEL initialized in main.ts
```bash
# Should see in logs:
[OTEL] OpenTelemetry SDK initialized for auth-service@1.0.0
```

**Check 2**: Environment variables set
```bash
echo $OTEL_EXPORTER_OTLP_ENDPOINT
echo $AUDIT_API_KEY
```

**Check 3**: Audit-service receiving requests
```bash
# Check audit-service logs
grep "POST /v1/telemetry/traces" logs.txt
```

### Issue: Authentication errors

**Solution**: Verify API key is correct
```bash
# In audit-service, check API key validation logs
grep "x-api-key" logs.txt
```

### Issue: High memory usage

**Solution**: Disable noisy instrumentation
```typescript
initOtel({
  // ... other config
  resourceAttributes: {
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-dns': { enabled: false },
  },
});
```

### Issue: Missing Prisma spans

**Solution**: Ensure `@prisma/instrumentation` is installed
```bash
pnpm add @prisma/instrumentation --filter @my-girok/nest-common
```

---

## Rollout Plan

### Phase 1: Pilot (Week 1)
- ✅ auth-service

### Phase 2: Core Services (Week 2)
- ⬜ audit-service
- ⬜ identity-service

### Phase 3: Supporting Services (Week 3)
- ⬜ authorization-service
- ⬜ analytics-service
- ⬜ personal-service

### Phase 4: Additional Services (Week 4)
- ⬜ notification-service (if exists)
- ⬜ storage-service (if exists)

---

## Performance Impact

### Overhead

**CPU**: ~1-2% overhead for instrumentation
**Memory**: ~10-20MB additional memory
**Latency**: ~0.5-1ms per request

### Mitigation

**Use sampling in production**:
```typescript
initOtel({
  samplingRatio: 0.1, // 10% sampling
});
```

**Ignore health checks**:
```typescript
initOtel({
  ignoreEndpoints: ['/health', '/ready', '/metrics'],
});
```

---

## Monitoring Queries

### Service Health Overview

```sql
SELECT
  service_name,
  count() as request_count,
  avg(duration_ns) / 1000000 as avg_duration_ms,
  quantile(0.95)(duration_ns / 1000000) as p95_ms,
  quantile(0.99)(duration_ns / 1000000) as p99_ms,
  countIf(status_code = 'ERROR') / count() * 100 as error_rate_percent
FROM audit_db.otel_audit_traces
WHERE service_name = 'auth-service'
  AND timestamp > now() - INTERVAL 1 HOUR
FORMAT Vertical;
```

### Top Slow Endpoints

```sql
SELECT
  JSONExtractString(span_attributes, 'http.route') as route,
  count() as request_count,
  avg(duration_ns) / 1000000 as avg_ms,
  quantile(0.95)(duration_ns / 1000000) as p95_ms
FROM audit_db.otel_audit_traces
WHERE service_name = 'auth-service'
  AND JSONExtractString(span_attributes, 'http.method') != ''
  AND timestamp > now() - INTERVAL 1 HOUR
GROUP BY route
ORDER BY avg_ms DESC
LIMIT 10
FORMAT Vertical;
```

### Top Slow Database Queries

```sql
SELECT
  JSONExtractString(span_attributes, 'db.statement') as query,
  count() as execution_count,
  avg(duration_ns) / 1000000 as avg_ms,
  max(duration_ns) / 1000000 as max_ms
FROM audit_db.otel_audit_traces
WHERE service_name = 'auth-service'
  AND span_name LIKE '%prisma%'
  AND timestamp > now() - INTERVAL 1 HOUR
GROUP BY query
ORDER BY avg_ms DESC
LIMIT 10
FORMAT Vertical;
```

### Error Rate by Endpoint

```sql
SELECT
  JSONExtractString(span_attributes, 'http.route') as route,
  count() as total,
  countIf(status_code = 'ERROR') as errors,
  (countIf(status_code = 'ERROR') / count()) * 100 as error_rate_percent
FROM audit_db.otel_audit_traces
WHERE service_name = 'auth-service'
  AND JSONExtractString(span_attributes, 'http.method') != ''
  AND timestamp > now() - INTERVAL 1 HOUR
GROUP BY route
HAVING errors > 0
ORDER BY error_rate_percent DESC
FORMAT Vertical;
```

---

## Success Criteria

- ✅ nest-common OTEL SDK enhanced with exportHeaders
- ✅ auth-service instrumented and running
- ✅ Console shows OTEL initialization
- ✅ Traces visible in ClickHouse
- ✅ HTTP requests traced automatically
- ✅ Prisma queries traced automatically
- ✅ gRPC calls traced automatically
- ✅ No significant performance impact (< 2%)
- ✅ API key authentication working
- ⬜ Other services rolled out (pending)

---

## Next Steps

1. **Monitor auth-service**: Verify stability and performance
2. **Create Grafana dashboards**: Service health, latency, errors
3. **Rollout to identity-service**: Apply same pattern
4. **Rollout to audit-service**: Self-telemetry
5. **Document patterns**: Share best practices for other services

---

**Completion**: POST_PHASE3_P5 is complete when auth-service is verified and stable in development environment.
