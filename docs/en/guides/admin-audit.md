# Admin Audit System Guide

> Comprehensive audit logging for web-admin with ClickHouse storage and 7-year retention

## Architecture Overview

```
web-admin (React + OTEL) -> OTEL Collector -> ClickHouse (audit_db, 7yr TTL)
                                           -> auth-service (PostgreSQL)
```

The admin audit system captures all administrative actions, UI events, and API calls for compliance and security monitoring.

## Port Configuration

| Service       | REST Port | gRPC Port |
| ------------- | --------- | --------- |
| auth-service  | 3001      | 50052     |
| audit-service | -         | -         |

## PostgreSQL Schema

### ServiceConfig

Stores service-level configuration settings:

```prisma
model ServiceConfig {
  id                 String   @id @db.Uuid
  serviceId          String   @unique @db.Uuid
  jwtValidation      Boolean  @default(true)
  domainValidation   Boolean  @default(true)
  ipWhitelistEnabled Boolean  @default(false)
  ipWhitelist        String[]
  rateLimitEnabled   Boolean  @default(true)
  rateLimitRequests  Int      @default(1000)
  rateLimitWindow    Int      @default(60)
  maintenanceMode    Boolean  @default(false)
  maintenanceMessage String?
  auditLevel         AuditLevel @default(STANDARD)
}
```

### ServiceFeature

Manages feature flags and toggles per service:

```prisma
model ServiceFeature {
  id           String  @id @db.Uuid
  serviceId    String  @db.Uuid
  parentId     String? @db.Uuid
  name         String
  code         String
  description  String?
  category     String?
  isActive     Boolean @default(true)
  isDefault    Boolean @default(false)
  displayOrder Int     @default(0)
}
```

### ServiceTesterUser

Defines test users with bypass capabilities:

```prisma
model ServiceTesterUser {
  id              String    @id @db.Uuid
  serviceId       String    @db.Uuid
  userId          String    @db.Uuid
  bypassDomain    Boolean   @default(false)
  bypassIP        Boolean   @default(false)
  bypassRateLimit Boolean   @default(false)
  expiresAt       DateTime?
  note            String?
  createdBy       String    @db.Uuid
}
```

## ClickHouse Tables

### admin_ui_events

Captures frontend user interactions:

```sql
CREATE TABLE audit_db.admin_ui_events (
  id UUID,
  timestamp DateTime64(3),
  session_id String,
  actor_id UUID,
  actor_email String,
  actor_role LowCardinality(String),
  event_type LowCardinality(String),
  component_name String,
  page_path String,
  properties String,
  user_agent String,
  ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), actor_id, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

### admin_api_logs

Records API request/response data:

```sql
CREATE TABLE audit_db.admin_api_logs (
  id UUID,
  timestamp DateTime64(3),
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

### admin_audit_logs

Stores administrative action audit trails:

```sql
CREATE TABLE audit_db.admin_audit_logs (
  id UUID,
  timestamp DateTime64(3),
  actor_id UUID,
  actor_email String,
  action LowCardinality(String),
  resource LowCardinality(String),
  resource_id String,
  before_state String,
  after_state String,
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
| GET    | `/v1/admin/services/:id/domains`         | List allowed domains         |
| POST   | `/v1/admin/services/:id/domains`         | Add allowed domain           |
| DELETE | `/v1/admin/services/:id/domains/:domain` | Remove domain                |

### Service Features

| Method | Endpoint                                     | Description    |
| ------ | -------------------------------------------- | -------------- |
| GET    | `/v1/admin/services/:id/features`            | List features  |
| POST   | `/v1/admin/services/:id/features`            | Create feature |
| PATCH  | `/v1/admin/services/:id/features/:featureId` | Update feature |
| DELETE | `/v1/admin/services/:id/features/:featureId` | Delete feature |

### Test Users Management

| Method | Endpoint                                         | Description       |
| ------ | ------------------------------------------------ | ----------------- |
| GET    | `/v1/admin/services/:id/testers/users`           | List test users   |
| POST   | `/v1/admin/services/:id/testers/users`           | Add test user     |
| DELETE | `/v1/admin/services/:id/testers/users/:userId`   | Remove test user  |
| GET    | `/v1/admin/services/:id/testers/admins`          | List test admins  |
| POST   | `/v1/admin/services/:id/testers/admins`          | Add test admin    |
| DELETE | `/v1/admin/services/:id/testers/admins/:adminId` | Remove test admin |

### Audit Queries (audit-service)

| Method | Endpoint              | Description            |
| ------ | --------------------- | ---------------------- |
| GET    | `/v1/audit/logs`      | Query audit logs       |
| GET    | `/v1/audit/logs/:id`  | Get specific log entry |
| GET    | `/v1/audit/ui-events` | Query UI events        |
| GET    | `/v1/audit/api-logs`  | Query API logs         |
| GET    | `/v1/audit/sessions`  | Query admin sessions   |

## Frontend Integration

### Audit Hooks

```typescript
import { useAuditEvent, usePageTracking, useUserTracking } from '../hooks';

// Track specific events
const { trackButtonClick, trackFormSubmit, trackSearch } = useAuditEvent();

// Auto-track page views
usePageTracking();

// Auto-track user identity
useUserTracking();
```

## Service Detail Tabs

The admin interface provides comprehensive service management through tabbed views:

| Tab       | Component           | Purpose                                |
| --------- | ------------------- | -------------------------------------- |
| Countries | ServiceCountriesTab | Manage service availability by country |
| Locales   | ServiceLocalesTab   | Configure supported languages          |
| Consents  | ServiceConsentsTab  | Define consent requirements            |
| Documents | ServiceDocumentsTab | Manage legal documents                 |
| Analytics | ServiceAnalyticsTab | View service metrics                   |
| Config    | ServiceConfigTab    | Edit service settings                  |
| Features  | ServiceFeaturesTab  | Toggle feature flags                   |
| Testers   | ServiceTestersTab   | Manage test accounts                   |
| Audit     | ServiceAuditTab     | View audit trail                       |

## Data Retention Policy

| Table            | TTL     | Legal Hold Support |
| ---------------- | ------- | ------------------ |
| admin_ui_events  | 7 years | No                 |
| admin_api_logs   | 7 years | No                 |
| admin_audit_logs | 7 years | Yes                |
| admin_sessions   | 2 years | No                 |

## Query Performance

Optimized indexes for common query patterns:

- `(toDate(timestamp), actor_id, id)` - User-centric queries
- `(toDate(timestamp), service_id, id)` - Service-centric queries
- `(toDate(timestamp), resource, id)` - Resource-centric queries

**Target Performance**: p95 < 200ms

## Security Considerations

- PII is filtered before storage
- IPv6 addresses are anonymized for GDPR compliance
- All endpoints require admin permissions
- Rate limiting is configurable per service
- Before/after state is logged for all mutations

---

**LLM Reference**: `docs/llm/guides/ADMIN_AUDIT.md`
