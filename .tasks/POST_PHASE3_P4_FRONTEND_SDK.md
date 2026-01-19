# Post-Phase 3-P4: Frontend SDK Integration

> **Status**: Completed ✅
> **Completed Date**: 2026-01-19
> **Priority**: P2 (Medium)
> **Dependencies**: Post-Phase 3-P1 (Audit Gateway)
> **Repository**: my-girok (packages/otel-web-sdk, apps/web-girok, apps/web-admin)
> **Verification Guide**: [POST_PHASE3_P4_VERIFICATION.md](POST_PHASE3_P4_VERIFICATION.md)

---

## Objective

Integrate OpenTelemetry Web SDK in frontend applications to send traces, metrics, and logs to audit-service gateway.

### Architecture

```
Browser                     Kubernetes
┌────────────────┐         ┌─────────────────┐
│ React App      │         │ audit-service   │
│                │         │ (Gateway)       │
│ @otel/web SDK  │─HTTPS──>│ /v1/telemetry/* │
│                │  JWT    │                 │
│ - Traces       │         └─────────────────┘
│ - Metrics      │
│ - User Actions │
└────────────────┘
```

---

## Implementation

### 1. Create OTEL Web SDK Package

**File**: `packages/otel-web-sdk/package.json`

```json
{
  "name": "@my-girok/otel-web-sdk",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-trace-web": "^1.28.0",
    "@opentelemetry/instrumentation-document-load": "^0.42.0",
    "@opentelemetry/instrumentation-fetch": "^0.54.0",
    "@opentelemetry/instrumentation-user-interaction": "^0.42.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.54.0",
    "@opentelemetry/resources": "^1.28.0",
    "@opentelemetry/semantic-conventions": "^1.28.0"
  }
}
```

**File**: `packages/otel-web-sdk/src/index.ts`

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';

export interface OtelWebSDKConfig {
  serviceName: string;
  serviceVersion: string;
  environment: 'development' | 'staging' | 'production';
  collectorUrl: string;  // https://audit-api.girok.dev/v1/telemetry
  authToken: string;
  tenantId?: string;
  debug?: boolean;
}

export function initializeOtelWebSDK(config: OtelWebSDKConfig): void {
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    'deployment.environment': config.environment,
    'tenant.id': config.tenantId || 'unknown',
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${config.collectorUrl}/traces`,
    headers: {
      Authorization: `Bearer ${config.authToken}`,
    },
  });

  const tracerProvider = new WebTracerProvider({ resource });
  tracerProvider.addSpanProcessor(
    new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 100,
      scheduledDelayMillis: 5000,
    })
  );
  tracerProvider.register();

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [
          /^https:\/\/.*\.girok\.dev\/.*/,
        ],
      }),
      new UserInteractionInstrumentation({
        eventNames: ['click', 'submit'],
      }),
    ],
  });

  if (config.debug) {
    console.log('[OTEL] Initialized', { serviceName: config.serviceName });
  }
}

export function createAuditLog(options: {
  action: string;
  resource: string;
  resourceId?: string;
}): void {
  // Implement audit logging
}
```

### 2. Integrate in web-girok

**File**: `apps/web-girok/src/lib/otel.ts`

```typescript
import { initializeOtelWebSDK } from '@my-girok/otel-web-sdk';
import { useAuthStore } from '@/stores/auth';

export function initializeObservability(): void {
  const { user, token } = useAuthStore.getState();

  if (!user || !token) return;

  initializeOtelWebSDK({
    serviceName: 'web-girok',
    serviceVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE as any,
    collectorUrl: `${import.meta.env.VITE_AUDIT_SERVICE_URL}/v1/telemetry`,
    authToken: token,
    tenantId: user.tenantId,
    debug: import.meta.env.DEV,
  });
}
```

**File**: `apps/web-girok/src/App.tsx`

```diff
 import { useEffect } from 'react';
 import { useAuthStore } from '@/stores/auth';
+import { initializeObservability } from '@/lib/otel';

 export function App() {
   const { isAuthenticated } = useAuthStore();

   useEffect(() => {
     if (isAuthenticated) {
+      initializeObservability();
     }
   }, [isAuthenticated]);

   return <Router />;
 }
```

### 3. Environment Variables

**File**: `apps/web-girok/.env.development`

```bash
VITE_AUDIT_SERVICE_URL=http://localhost:3003
VITE_APP_VERSION=1.0.0
```

**File**: `apps/web-girok/.env.production`

```bash
VITE_AUDIT_SERVICE_URL=https://audit-api.girok.dev
VITE_APP_VERSION=1.0.0
```

---

## Verification

### Test in Development

```bash
# Build SDK package
pnpm --filter @my-girok/otel-web-sdk build

# Start web-girok
pnpm --filter web-girok dev

# Open browser DevTools Network tab
# Login to app
# Verify POST requests to http://localhost:3003/v1/telemetry/traces
```

### Verify in ClickHouse

```sql
-- Check if frontend traces are being received
SELECT
  count() as total_traces,
  uniqExact(service_name) as services,
  uniqExact(tenant_id) as tenants
FROM audit_db.otel_audit_traces
WHERE service_name = 'web-girok'
  AND timestamp > now() - INTERVAL 1 HOUR;

-- Check recent frontend spans
SELECT
  timestamp,
  tenant_id,
  span_name,
  duration_ns / 1000000 as duration_ms
FROM audit_db.otel_audit_traces
WHERE service_name = 'web-girok'
ORDER BY timestamp DESC
LIMIT 10;
```

---

## Monitoring

### Key Metrics to Track

- Document load time
- API call latency
- User interaction events
- Navigation timing
- Resource loading time

### Example Queries

```sql
-- Average page load time
SELECT
  toStartOfHour(timestamp) as hour,
  avg(duration_ns) / 1000000 as avg_duration_ms
FROM audit_db.otel_audit_traces
WHERE service_name = 'web-girok'
  AND span_name = 'documentLoad'
GROUP BY hour
ORDER BY hour DESC;

-- Top slow API calls
SELECT
  span_attributes['http.url'] as url,
  count() as call_count,
  avg(duration_ns) / 1000000 as avg_duration_ms,
  quantile(0.95)(duration_ns / 1000000) as p95_duration_ms
FROM audit_db.otel_audit_traces
WHERE service_name = 'web-girok'
  AND span_attributes['http.method'] != ''
GROUP BY url
ORDER BY avg_duration_ms DESC
LIMIT 10;
```

---

**Next Phase**: [POST_PHASE3_P5_BACKEND_INSTRUMENTATION.md](POST_PHASE3_P5_BACKEND_INSTRUMENTATION.md)
