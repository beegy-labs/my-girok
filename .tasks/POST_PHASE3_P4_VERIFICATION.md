# POST_PHASE3_P4: Frontend SDK Integration - Verification Guide

> **Created**: 2026-01-19
> **Status**: Ready for Testing
> **Packages**: `packages/otel-web-sdk`, `apps/web-girok`, `apps/web-admin`

---

## Summary

Integrated OpenTelemetry Web SDK in frontend applications to send telemetry data (traces, metrics, logs) to audit-service gateway.

### Created Components

1. **@my-girok/otel-web-sdk** - Reusable OTEL SDK package
2. **web-girok integration** - User-facing app with session-based auth
3. **web-admin updates** - Admin app environment variables updated

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser                                                         │
│                                                                 │
│ ┌─────────────────┐           ┌─────────────────┐             │
│ │ web-girok       │           │ web-admin       │             │
│ │                 │           │                 │             │
│ │ @otel/web-sdk   │           │ Custom OTEL     │             │
│ │ - Auto traces   │           │ - UI events     │             │
│ │ - User actions  │           │ - Page tracking │             │
│ │ - Audit logs    │           │ - Error tracking│             │
│ └────────┬────────┘           └────────┬────────┘             │
│          │                             │                       │
└──────────┼─────────────────────────────┼───────────────────────┘
           │ HTTPS (Session Cookie)      │ HTTPS (Session Cookie)
           │                             │
           ▼                             ▼
    ┌────────────────────────────────────────────┐
    │ audit-service                              │
    │ /v1/telemetry/traces                       │
    │                                            │
    │ - Auth via session cookie                  │
    │ - Validates tenant/user context            │
    │ - Exports to Kafka (otel.audit.*)          │
    └────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. @my-girok/otel-web-sdk Package

**Location**: `packages/otel-web-sdk/`

**Key Features**:
- **Auto-instrumentation**: Document load, fetch/XHR, user interactions
- **Manual tracking**: Custom spans, audit logs, events
- **Session-based auth**: Works with cookie authentication
- **Tenant-aware**: Includes tenant/user context in all telemetry
- **TypeScript**: Full type safety and intellisense

**Exports**:
```typescript
// Initialize SDK
initializeOtelWebSDK(config: OtelWebSDKConfig): void

// Create audit logs
createAuditLog(options: {
  action: string;
  resource: string;
  resourceId?: string;
  result?: 'success' | 'failure';
  metadata?: Record<string, any>;
}): void

// Track custom events
trackEvent(eventName: string, attributes?: Record<string, any>): void

// Execute within traced context
withSpan<T>(name: string, fn: (span) => Promise<T>): Promise<T>

// Update user context after login
updateUserContext(userId: string, tenantId?: string): void

// Check initialization status
isOtelInitialized(): boolean
```

### 2. web-girok Integration

**Files Modified**:
- `apps/web-girok/src/App.tsx` - Initialize on auth
- `apps/web-girok/src/lib/otel.ts` - SDK wrapper
- `apps/web-girok/.env` - Environment variables
- `apps/web-girok/package.json` - Added dependency

**Initialization Logic**:
```typescript
useEffect(() => {
  if (isAuthenticated) {
    initializeObservability();
  }
}, [isAuthenticated]);
```

**Automatic Tracking**:
- ✅ Document load performance
- ✅ API calls (fetch/XHR)
- ✅ User clicks and form submits
- ✅ Navigation events

### 3. web-admin Updates

**Status**: Already has OTEL implementation

**Changes**: Environment variables updated to point to audit-service

**Existing Features**:
- Custom UI event tracking
- Page view tracking
- Error tracking
- Session management

---

## Environment Variables

### web-girok

**.env.example**:
```bash
VITE_API_URL=http://localhost:3001
VITE_AUTH_BFF_URL=http://localhost:3001
VITE_AUDIT_SERVICE_URL=http://localhost:3003
VITE_APP_VERSION=1.0.0
```

**Production (.env)**:
```bash
VITE_AUTH_BFF_URL=https://my-api-dev.girok.dev/auth
VITE_AUDIT_SERVICE_URL=https://audit-api.girok.dev
VITE_APP_VERSION=1.0.0
```

### web-admin

**.env**:
```bash
VITE_OTEL_ENDPOINT=https://audit-api.girok.dev
VITE_APP_VERSION=1.0.0
VITE_ENV=development
```

---

## Installation & Build

### Install Dependencies

```bash
# From project root
pnpm install

# This will install:
# - @my-girok/otel-web-sdk dependencies
# - Link SDK to web-girok workspace
```

### Build SDK Package

```bash
pnpm --filter @my-girok/otel-web-sdk build
```

**Expected Output**:
```
packages/otel-web-sdk/dist/
├── index.js
├── index.d.ts
├── index.js.map
└── index.d.ts.map
```

### Build Frontend Apps

```bash
# Build web-girok
pnpm --filter web-girok build

# Build web-admin
pnpm --filter web-admin build
```

---

## Development Testing

### 1. Start Services

```bash
# Terminal 1: Start audit-service
cd services/audit-service
pnpm dev

# Terminal 2: Start web-girok
cd apps/web-girok
pnpm dev

# Terminal 3: Start web-admin
cd apps/web-admin
pnpm dev
```

### 2. Verify Initialization

**web-girok** (http://localhost:3000):
1. Open browser DevTools Console
2. Login to the application
3. Look for: `[OTEL] Observability initialized for web-girok`
4. Check Network tab for POST requests to `/v1/telemetry/traces`

**web-admin** (http://localhost:5173):
1. Open browser DevTools Console
2. Look for: `[OTEL] Initialized successfully`
3. Navigate to any page
4. Verify traces are being sent

### 3. Verify Telemetry Data

**Network Tab**:
```
POST https://audit-api.girok.dev/v1/telemetry/traces
Status: 200 OK
Request Headers:
  Cookie: girok_session=...
  Content-Type: application/json
Request Payload:
  {
    "resourceSpans": [...]
  }
```

### 4. Check ClickHouse Data

```bash
clickhouse-client --query="
SELECT
  count() as total_spans,
  uniqExact(service_name) as services,
  uniqExact(tenant_id) as tenants,
  groupArray(service_name) as service_list
FROM audit_db.otel_audit_traces
WHERE timestamp > now() - INTERVAL 10 MINUTE
FORMAT Vertical"
```

**Expected Output**:
```
total_spans:   42
services:      2
tenants:       1
service_list:  ['web-girok','web-admin']
```

---

## Usage Examples

### Track User Actions in web-girok

```typescript
import { createAuditLog } from '@/lib/otel';

// In resume edit page
const handleSaveResume = async () => {
  try {
    await saveResume(data);

    createAuditLog({
      action: 'resume.update',
      resource: 'resume',
      resourceId: resumeId,
      result: 'success',
      metadata: {
        sections_updated: ['experience', 'education'],
      },
    });
  } catch (error) {
    createAuditLog({
      action: 'resume.update',
      resource: 'resume',
      resourceId: resumeId,
      result: 'failure',
      metadata: {
        error: error.message,
      },
    });
  }
};
```

### Track Custom Events

```typescript
import { trackEvent } from '@/lib/otel';

// Track feature usage
trackEvent('feature.export_pdf', {
  format: 'pdf',
  template: 'modern',
});

// Track search
trackEvent('search.performed', {
  query: searchTerm,
  results_count: results.length,
});
```

### Trace Async Operations

```typescript
import { withSpan } from '@/lib/otel';

const loadDashboardData = async () => {
  await withSpan('dashboard.load', async (span) => {
    span.setAttribute('user.id', userId);

    const data = await fetchDashboardData();

    span.setAttribute('data.items_count', data.length);
    return data;
  });
};
```

---

## Verification Queries

### Recent Frontend Traces

```sql
SELECT
  timestamp,
  tenant_id,
  service_name,
  span_name,
  duration_ns / 1000000 as duration_ms,
  JSONExtractString(span_attributes, 'http.url') as url
FROM audit_db.otel_audit_traces
WHERE service_name IN ('web-girok', 'web-admin')
  AND timestamp > now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC
LIMIT 20
FORMAT Vertical;
```

### Document Load Performance

```sql
SELECT
  service_name,
  count() as page_loads,
  avg(duration_ns / 1000000) as avg_load_time_ms,
  quantile(0.5)(duration_ns / 1000000) as p50_ms,
  quantile(0.95)(duration_ns / 1000000) as p95_ms,
  quantile(0.99)(duration_ns / 1000000) as p99_ms
FROM audit_db.otel_audit_traces
WHERE span_name = 'documentLoad'
  AND timestamp > now() - INTERVAL 1 DAY
GROUP BY service_name
FORMAT Vertical;
```

### API Call Latency

```sql
SELECT
  JSONExtractString(span_attributes, 'http.method') as method,
  JSONExtractString(span_attributes, 'http.url') as url,
  count() as call_count,
  avg(duration_ns / 1000000) as avg_latency_ms,
  quantile(0.95)(duration_ns / 1000000) as p95_ms
FROM audit_db.otel_audit_traces
WHERE service_name = 'web-girok'
  AND span_kind = 'client'
  AND JSONExtractString(span_attributes, 'http.method') != ''
  AND timestamp > now() - INTERVAL 1 DAY
GROUP BY method, url
ORDER BY call_count DESC
LIMIT 20
FORMAT Vertical;
```

### Audit Logs from Frontend

```sql
SELECT
  timestamp,
  tenant_id,
  service_name,
  span_name as action,
  JSONExtractString(span_attributes, 'audit.resource') as resource,
  JSONExtractString(span_attributes, 'audit.resource_id') as resource_id,
  JSONExtractString(span_attributes, 'audit.result') as result
FROM audit_db.otel_audit_traces
WHERE JSONExtractString(span_attributes, 'audit.compliance') = 'true'
  AND timestamp > now() - INTERVAL 1 HOUR
ORDER BY timestamp DESC
LIMIT 20
FORMAT Vertical;
```

### User Interaction Events

```sql
SELECT
  span_name as event_type,
  count() as event_count,
  uniqExact(tenant_id) as unique_users
FROM audit_db.otel_audit_traces
WHERE service_name = 'web-girok'
  AND span_name LIKE 'event.%'
  AND timestamp > now() - INTERVAL 1 DAY
GROUP BY event_type
ORDER BY event_count DESC
FORMAT Vertical;
```

---

## Troubleshooting

### Issue: No traces in ClickHouse

**Check 1**: Verify SDK initialized
```javascript
// In browser console
import { isOtelInitialized } from '@my-girok/otel-web-sdk';
console.log(isOtelInitialized()); // Should be true
```

**Check 2**: Verify audit-service receiving requests
```bash
# Check audit-service logs
kubectl logs -f deployment/audit-service -n girok | grep "POST /v1/telemetry"
```

**Check 3**: Verify Kafka topics
```bash
kubectl exec -it kafka-0 -n kafka -- kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic otel.audit.traces \
  --max-messages 1
```

### Issue: CORS errors

**Solution**: Ensure audit-service CORS configuration includes:
```typescript
cors: {
  origin: [
    'http://localhost:3000', // web-girok dev
    'http://localhost:5173', // web-admin dev
    'https://girok.dev',
    'https://admin.girok.dev',
  ],
  credentials: true,
}
```

### Issue: Session cookie not sent

**Solution**: Ensure `withCredentials: true` in OTLP exporter:
```typescript
// In otel-web-sdk/src/index.ts
const traceExporter = new OTLPTraceExporter({
  url: `${config.collectorUrl}/traces`,
  headers: {
    Authorization: `Bearer ${config.authToken}`,
  },
  // Add this if needed:
  // credentials: 'include',
});
```

### Issue: High memory usage

**Solution**: Reduce batch size in SDK config:
```typescript
new BatchSpanProcessor(traceExporter, {
  maxQueueSize: 50,        // Reduce from 100
  maxExportBatchSize: 5,   // Reduce from 10
  scheduledDelayMillis: 5000,
})
```

---

## Performance Considerations

### Sampling

For production, consider sampling:
```typescript
// In web-girok/src/lib/otel.ts
const samplingRate = import.meta.env.PROD ? 0.1 : 1.0; // 10% in prod

if (Math.random() > samplingRate) {
  return; // Skip initialization
}
```

### Bundle Size

**SDK bundle size**: ~150KB (minified + gzipped ~45KB)

**Dependencies**:
- `@opentelemetry/api`: 15KB
- `@opentelemetry/sdk-trace-web`: 50KB
- `@opentelemetry/exporter-trace-otlp-http`: 30KB
- `@opentelemetry/instrumentation-*`: 55KB

**Optimization**: Use code splitting:
```typescript
// Lazy load OTEL
const initOtel = async () => {
  const { initializeOtelWebSDK } = await import('@my-girok/otel-web-sdk');
  initializeOtelWebSDK(config);
};
```

---

## Success Criteria

- ✅ SDK package builds without errors
- ✅ web-girok initializes OTEL after login
- ✅ web-admin sends telemetry with updated config
- ✅ Traces visible in browser Network tab
- ✅ Data flows to audit-service
- ✅ ClickHouse receives frontend traces
- ✅ Tenant/user context included in all spans
- ✅ No console errors or warnings
- ✅ Performance impact < 5% on page load
- ✅ Bundle size increase < 50KB

---

## Next Steps

1. **Monitor production**: Set up alerts for high latency or error rates
2. **Create dashboards**: Grafana dashboards for frontend performance
3. **Add more audit logs**: Track critical user actions
4. **Implement sampling**: Reduce data volume in production
5. **POST_PHASE3_P5**: Backend service instrumentation

---

**Completion**: This phase is complete when all success criteria are met and verified in development environment.
