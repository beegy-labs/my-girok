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

## Related Documentation

- **ClickHouse & API**: `admin-audit-api.md`
- Browser OTEL: `otel-browser.md`
