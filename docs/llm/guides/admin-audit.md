# Admin Audit System

```
web-admin (React+OTEL) -> OTEL Collector -> ClickHouse (audit_db, 7yr TTL)
                                         -> auth-service (PostgreSQL)
```

## Port Config

| Service       | REST | gRPC  |
| ------------- | ---- | ----- |
| auth-service  | 3001 | 50052 |
| audit-service | -    | -     |

## PostgreSQL Schema

### ServiceConfig

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

```sql
CREATE TABLE audit_db.admin_ui_events (
  id UUID, timestamp DateTime64(3), session_id String,
  actor_id UUID, actor_email String, actor_role LowCardinality(String),
  event_type LowCardinality(String), component_name String,
  page_path String, properties String, user_agent String, ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), actor_id, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

### admin_api_logs

```sql
CREATE TABLE audit_db.admin_api_logs (
  id UUID, timestamp DateTime64(3), trace_id String, span_id String,
  service_id UUID, endpoint String, method LowCardinality(String),
  status_code UInt16, duration_ms UInt32, actor_id UUID, actor_email String,
  request_body String, response_body String, ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), service_id, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

### admin_audit_logs

```sql
CREATE TABLE audit_db.admin_audit_logs (
  id UUID, timestamp DateTime64(3), actor_id UUID, actor_email String,
  action LowCardinality(String), resource LowCardinality(String),
  resource_id String, before_state String, after_state String,
  reason String, ip_address IPv6
) ENGINE = MergeTree()
ORDER BY (toDate(timestamp), resource, id)
TTL toDateTime(timestamp) + INTERVAL 7 YEAR;
```

## API Endpoints

### Service Config (auth-service)

| Method | Endpoint                                 |
| ------ | ---------------------------------------- |
| GET    | `/v1/admin/services/:id/config`          |
| PATCH  | `/v1/admin/services/:id/config`          |
| GET    | `/v1/admin/services/:id/domains`         |
| POST   | `/v1/admin/services/:id/domains`         |
| DELETE | `/v1/admin/services/:id/domains/:domain` |

### Service Features

| Method | Endpoint                                     |
| ------ | -------------------------------------------- |
| GET    | `/v1/admin/services/:id/features`            |
| POST   | `/v1/admin/services/:id/features`            |
| PATCH  | `/v1/admin/services/:id/features/:featureId` |
| DELETE | `/v1/admin/services/:id/features/:featureId` |

### Testers

| Method | Endpoint                                         |
| ------ | ------------------------------------------------ |
| GET    | `/v1/admin/services/:id/testers/users`           |
| POST   | `/v1/admin/services/:id/testers/users`           |
| DELETE | `/v1/admin/services/:id/testers/users/:userId`   |
| GET    | `/v1/admin/services/:id/testers/admins`          |
| POST   | `/v1/admin/services/:id/testers/admins`          |
| DELETE | `/v1/admin/services/:id/testers/admins/:adminId` |

### Audit Queries (audit-service)

| Method | Endpoint              |
| ------ | --------------------- |
| GET    | `/v1/audit/logs`      |
| GET    | `/v1/audit/logs/:id`  |
| GET    | `/v1/audit/ui-events` |
| GET    | `/v1/audit/api-logs`  |
| GET    | `/v1/audit/sessions`  |

## Frontend Hooks

```typescript
import { useAuditEvent, usePageTracking, useUserTracking } from '../hooks';

const { trackButtonClick, trackFormSubmit, trackSearch } = useAuditEvent();
usePageTracking();
useUserTracking();
```

## Service Detail Tabs

| Tab       | Component           |
| --------- | ------------------- |
| Countries | ServiceCountriesTab |
| Locales   | ServiceLocalesTab   |
| Consents  | ServiceConsentsTab  |
| Documents | ServiceDocumentsTab |
| Analytics | ServiceAnalyticsTab |
| Config    | ServiceConfigTab    |
| Features  | ServiceFeaturesTab  |
| Testers   | ServiceTestersTab   |
| Audit     | ServiceAuditTab     |

## Data Retention

| Table            | TTL | Legal Hold |
| ---------------- | --- | ---------- |
| admin_ui_events  | 7yr | No         |
| admin_api_logs   | 7yr | No         |
| admin_audit_logs | 7yr | Yes        |
| admin_sessions   | 2yr | No         |

## Query Indexes

- `(toDate(timestamp), actor_id, id)` - user queries
- `(toDate(timestamp), service_id, id)` - service queries
- `(toDate(timestamp), resource, id)` - resource queries

Target p95: < 200ms

## Security

- PII filtered before storage
- IPv6 anonymized (GDPR)
- Admin permissions required
- Configurable rate limits
- Before/after state logged
