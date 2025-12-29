# Admin Audit System Guide

> Complete implementation guide for the enterprise-grade Admin Audit System

## Overview

The Admin Audit System provides comprehensive service management, sanction handling, and audit logging with OpenTelemetry integration. It enables:

- **Service Configuration Management** - Domain validation, JWT settings, rate limiting, maintenance mode
- **Service Feature System** - Hierarchical feature management with granular permissions
- **Tester Management** - Per-service tester users and admins with bypass controls
- **Enhanced Sanction System** - Feature-level restrictions, appeals, notifications
- **Complete Audit Trail** - OTEL-based UI events, API logs, and audit logs via ClickHouse

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              web-admin                                       │
│                    (React + OTEL Browser SDK + Session)                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ OTLP/HTTP
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OTEL Collector (Gateway)                             │
│   receivers: otlp | processors: batch, attributes, filter | exporters: ch   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────────────────────────┐
        ▼                        ▼                                            ▼
┌──────────────────┐  ┌──────────────────────────┐              ┌──────────────────┐
│   auth-service   │  │      ClickHouse          │              │   Prometheus     │
│   (PostgreSQL)   │  │  audit_db (7yr TTL)      │              │   + Grafana      │
└──────────────────┘  └──────────────────────────┘              └──────────────────┘
                                 │
                                 ▼
                      ┌──────────────────┐
                      │  audit-service   │
                      │  (Query APIs)    │
                      └──────────────────┘
```

## Database Schema

### PostgreSQL (auth-service)

#### ServiceConfig

Stores service-level configuration for validation and rate limiting.

```prisma
model ServiceConfig {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serviceId         String   @unique @db.Uuid
  jwtValidation     Boolean  @default(true)
  domainValidation  Boolean  @default(true)
  ipWhitelistEnabled Boolean @default(false)
  ipWhitelist       String[]
  rateLimitEnabled  Boolean  @default(true)
  rateLimitRequests Int      @default(1000)
  rateLimitWindow   Int      @default(60)
  maintenanceMode   Boolean  @default(false)
  maintenanceMessage String?
  auditLevel        AuditLevel @default(STANDARD)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

#### ServiceFeature

Hierarchical feature management with parent-child relationships.

```prisma
model ServiceFeature {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serviceId   String   @db.Uuid
  parentId    String?  @db.Uuid
  name        String
  code        String
  description String?
  category    String?
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false)
  displayOrder Int     @default(0)
}
```

#### ServiceTesterUser / ServiceTesterAdmin

Manage test users with bypass permissions.

```prisma
model ServiceTesterUser {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serviceId       String   @db.Uuid
  userId          String   @db.Uuid
  bypassDomain    Boolean  @default(false)
  bypassIP        Boolean  @default(false)
  bypassRateLimit Boolean  @default(false)
  expiresAt       DateTime?
  note            String?
  createdBy       String   @db.Uuid
}
```

### ClickHouse (audit_db)

#### admin_ui_events

Tracks browser UI events from the admin console.

```sql
CREATE TABLE audit_db.admin_ui_events (
  id UUID DEFAULT generateUUIDv7(),
  timestamp DateTime64(3) DEFAULT now64(3),
  session_id String,
  actor_id UUID,
  actor_email String,
  actor_role LowCardinality(String),
  event_type LowCardinality(String),  -- 'click', 'page_view', 'form_submit'
  component_name String,
  page_path String,
  properties String,  -- JSON
  user_agent String,
  ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), actor_id, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

#### admin_api_logs

Tracks API requests to admin endpoints.

```sql
CREATE TABLE audit_db.admin_api_logs (
  id UUID DEFAULT generateUUIDv7(),
  timestamp DateTime64(3) DEFAULT now64(3),
  trace_id String,
  span_id String,
  service_id UUID,
  endpoint String,
  method LowCardinality(String),
  status_code UInt16,
  duration_ms UInt32,
  actor_id UUID,
  actor_email String,
  request_body String,
  response_body String,
  ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), service_id, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

#### admin_audit_logs

Tracks data changes with before/after state.

```sql
CREATE TABLE audit_db.admin_audit_logs (
  id UUID DEFAULT generateUUIDv7(),
  timestamp DateTime64(3) DEFAULT now64(3),
  actor_id UUID,
  actor_email String,
  action LowCardinality(String),  -- 'CREATE', 'UPDATE', 'DELETE'
  resource LowCardinality(String),
  resource_id String,
  before_state String,  -- JSON
  after_state String,   -- JSON
  reason String,
  ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), resource, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

## API Endpoints

### Service Configuration (auth-service)

| Method | Endpoint                                 | Description                  |
| ------ | ---------------------------------------- | ---------------------------- |
| GET    | `/v1/admin/services/:id/config`          | Get service configuration    |
| PATCH  | `/v1/admin/services/:id/config`          | Update service configuration |
| GET    | `/v1/admin/services/:id/domains`         | List service domains         |
| POST   | `/v1/admin/services/:id/domains`         | Add domain                   |
| DELETE | `/v1/admin/services/:id/domains/:domain` | Remove domain                |

### Service Features (auth-service)

| Method | Endpoint                                     | Description    |
| ------ | -------------------------------------------- | -------------- |
| GET    | `/v1/admin/services/:id/features`            | List features  |
| POST   | `/v1/admin/services/:id/features`            | Create feature |
| PATCH  | `/v1/admin/services/:id/features/:featureId` | Update feature |
| DELETE | `/v1/admin/services/:id/features/:featureId` | Delete feature |

### Testers (auth-service)

| Method | Endpoint                                         | Description         |
| ------ | ------------------------------------------------ | ------------------- |
| GET    | `/v1/admin/services/:id/testers/users`           | List user testers   |
| POST   | `/v1/admin/services/:id/testers/users`           | Add user tester     |
| DELETE | `/v1/admin/services/:id/testers/users/:userId`   | Remove user tester  |
| GET    | `/v1/admin/services/:id/testers/admins`          | List admin testers  |
| POST   | `/v1/admin/services/:id/testers/admins`          | Add admin tester    |
| DELETE | `/v1/admin/services/:id/testers/admins/:adminId` | Remove admin tester |

### Audit Queries (audit-service)

| Method | Endpoint              | Description                  |
| ------ | --------------------- | ---------------------------- |
| GET    | `/v1/audit/logs`      | List audit logs with filters |
| GET    | `/v1/audit/logs/:id`  | Get audit log detail         |
| GET    | `/v1/audit/ui-events` | List UI events               |
| GET    | `/v1/audit/api-logs`  | List API logs                |
| GET    | `/v1/audit/sessions`  | List active sessions         |

## Frontend Implementation

### OTEL Browser SDK

The browser SDK is initialized in `apps/web-admin/src/lib/otel/`:

```typescript
// tracer.ts
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export function initOtel(): void {
  const exporter = new OTLPTraceExporter({
    url: `${OTEL_ENDPOINT}/v1/traces`,
  });

  tracerProvider = new WebTracerProvider({
    resource: resourceFromAttributes(resourceAttributes),
    spanProcessors: [new BatchSpanProcessor(exporter, batchConfig)],
  });

  tracerProvider.register({
    contextManager: new ZoneContextManager(),
  });
}
```

### Session Management

Sessions are managed in `session.ts`:

```typescript
export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId || isSessionExpired()) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    sessionStorage.setItem(SESSION_START_KEY, new Date().toISOString());
  }
  return sessionId;
}
```

### Audit Hooks

Use the hooks in `apps/web-admin/src/hooks/`:

```typescript
import { useAuditEvent, usePageTracking, useUserTracking } from '../hooks';

function MyComponent() {
  const { trackButtonClick, trackFormSubmit, trackSearch } = useAuditEvent();

  usePageTracking();  // Auto page view tracking
  useUserTracking();  // Sync user context

  return (
    <Button
      trackingName="SaveSettings"
      onClick={handleSave}
    >
      Save
    </Button>
  );
}
```

### Service Detail Page Tabs

The Service Detail page includes these tabs:

| Tab       | Component           | Description                                |
| --------- | ------------------- | ------------------------------------------ |
| Countries | ServiceCountriesTab | Manage supported countries                 |
| Locales   | ServiceLocalesTab   | Manage supported languages                 |
| Consents  | ServiceConsentsTab  | Configure consent requirements             |
| Documents | ServiceDocumentsTab | Manage legal documents                     |
| Analytics | ServiceAnalyticsTab | View service analytics                     |
| Config    | ServiceConfigTab    | Configure domains, security, rate limiting |
| Features  | ServiceFeaturesTab  | Manage feature flags                       |
| Testers   | ServiceTestersTab   | Manage test users/admins                   |
| Audit     | ServiceAuditTab     | View audit logs                            |

## Data Retention

| Table            | TTL     | Legal Hold Exempt |
| ---------------- | ------- | ----------------- |
| admin_ui_events  | 7 years | No                |
| admin_api_logs   | 7 years | No                |
| admin_audit_logs | 7 years | Yes               |
| admin_sessions   | 2 years | No                |

## Query Performance

Target p95 latency: < 200ms

Recommended indexes:

- `(toDate(timestamp), actor_id, id)` for user-based queries
- `(toDate(timestamp), service_id, id)` for service-based queries
- `(toDate(timestamp), resource, id)` for resource-based queries

## Security Considerations

1. **Sensitive Data Filtering** - PII is filtered before storage
2. **IP Anonymization** - IPv6 addresses are anonymized for GDPR
3. **Access Control** - Admin permissions required for all endpoints
4. **Rate Limiting** - Configurable per-service rate limits
5. **Audit Trail** - All admin actions are logged with before/after state

## Related Documentation

- [.ai/services/auth-service.md](../../.ai/services/auth-service.md) - Auth service API reference
- [.ai/services/audit-service.md](../../.ai/services/audit-service.md) - Audit service API reference
- [.ai/otel.md](../../.ai/otel.md) - OTEL integration patterns
- [docs/guides/OTEL_BROWSER.md](./OTEL_BROWSER.md) - Browser OTEL setup guide
