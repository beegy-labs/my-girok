# Auth Service

> Authentication & authorization microservice

## Tech Stack

- **Framework**: NestJS 11 + TypeScript 5.9
- **Database**: PostgreSQL 16 + Prisma 6
- **Auth**: Passport.js + JWT
- **Port**: 3001

## API Endpoints

### Authentication

```
POST /v1/auth/register       # { email, password, name, consents[] }
POST /v1/auth/login          # { email, password }
POST /v1/auth/refresh        # { refreshToken }
POST /v1/auth/logout         # (auth required)
GET  /v1/auth/google         # OAuth redirect
GET  /v1/auth/google/callback
POST /v1/auth/domain-access  # Time-limited token
```

### Users

```
GET   /v1/users/me                    # Profile (auth)
PATCH /v1/users/me                    # Update (auth)
POST  /v1/users/me/change-password    # (auth)
GET   /v1/users/by-username/:username # Public profile
```

### Legal & Consent

```
GET  /v1/legal/consent-requirements   # Public
GET  /v1/legal/documents/:type        # Public
GET  /v1/legal/consents               # User consents (auth)
POST /v1/legal/consents               # Create (auth)
PUT  /v1/legal/consents/:type         # Update (auth)
```

### Admin (H-RBAC)

```
POST /v1/admin/auth/login|refresh|logout
GET  /v1/admin/auth/me

GET|POST        /v1/admin/tenants           # tenant:read|create
GET|PUT         /v1/admin/tenants/:id       # tenant:read|update
PATCH           /v1/admin/tenants/:id/status # tenant:approve

GET|POST|PUT|DELETE /v1/admin/legal/documents     # legal:*
GET             /v1/admin/legal/consents[/stats]  # legal:read

GET             /v1/admin/audit/logs[/export]     # audit:read
```

## Key Flows

### Registration

1. Validate DTO → Check email → Hash password (bcrypt 12)
2. Create user + consents in transaction
3. Return { user, accessToken, refreshToken }

### Login

1. Find user → Verify password → Generate tokens
2. Create session → Return tokens

## JWT Configuration

| Token   | Expiration | Storage         |
| ------- | ---------- | --------------- |
| Access  | 15 min     | localStorage    |
| Refresh | 14 days    | HttpOnly cookie |

## H-RBAC Hierarchy

```
SYSTEM LEVEL
├── system_super   (level 100) - Full access (*)
├── system_admin   (level 80)  - Partner/User/Legal
└── system_moderator (level 50) - Content moderation

TENANT LEVEL
├── partner_super  (level 100) - Full tenant
├── partner_admin  (level 80)  - Admin management
└── partner_editor (level 50)  - View only
```

### Permissions

```typescript
@Permissions('legal:read')    // resource:action
@Permissions('tenant:approve')
@Permissions('*')             // Wildcard
```

## Guards

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) { }

@UseGuards(AdminAuthGuard, PermissionGuard)
@Permissions('legal:create')
createDocument(@CurrentAdmin() admin: AdminPayload) { }
```

## Security

- Password: bcrypt 12 rounds
- Rate limiting: 5 req/min (login/register)
- Account lockout: 5 failed attempts (30 min)

## Caching (Valkey)

| Data             | Key Pattern                 | TTL | Invalidation   |
| ---------------- | --------------------------- | --- | -------------- |
| Role Permissions | `auth:permissions:{roleId}` | 24h | role update    |
| Service Config   | `auth:service:{slug}`       | 24h | service update |

```typescript
import { CacheKey } from '@my-girok/nest-common';

const key = CacheKey.make('auth', 'permissions', roleId);
// → "dev:auth:permissions:550e8400..."
```

**Policy**: `docs/policies/CACHING.md` | `.ai/caching.md`

---

## Global Account System

> For detailed policy and architecture: `docs/policies/GLOBAL_ACCOUNT.md`

### Quick Reference

| Mode    | Description                               |
| ------- | ----------------------------------------- |
| SERVICE | Per-service independent account (default) |
| UNIFIED | Integrated account across services        |

### API Endpoints

| Category      | Endpoints                                                |
| ------------- | -------------------------------------------------------- |
| Service       | `POST /v1/services/:slug/join`, `DELETE .../withdraw`    |
| Linking       | `POST /v1/users/me/link-account`, `POST .../accept-link` |
| Operator      | `POST /v1/admin/operators`, `POST .../invite`            |
| Law Registry  | `GET /v1/admin/laws`, `POST /v1/admin/laws/seed`         |
| Personal Info | `GET/PATCH/DELETE /v1/users/me/personal-info`            |

### Guards

```typescript
@UseGuards(UnifiedAuthGuard)                    // Token type routing
@UseGuards(UnifiedAuthGuard, AccountTypeGuard)  // USER/ADMIN/OPERATOR
@UseGuards(UnifiedAuthGuard, ServiceAccessGuard) // Service membership
@UseGuards(UnifiedAuthGuard, CountryConsentGuard) // Country consent
```

### Decorators

| Decorator                   | Purpose                    |
| --------------------------- | -------------------------- |
| `@CurrentUser()`            | Get user/admin/operator    |
| `@RequireAccountType(type)` | Restrict by account type   |
| `@RequireService(slug)`     | Require service membership |
| `@Permissions(perm)`        | Admin permission check     |

---

## Service Configuration (#399)

Per-service validation and audit settings.

```prisma
model ServiceConfig {
  id                 String     @id @db.Uuid
  serviceId          String     @unique
  jwtValidation      Boolean    @default(true)
  domainValidation   Boolean    @default(true)
  ipWhitelistEnabled Boolean    @default(false)
  ipWhitelist        String[]   @default([])
  rateLimitEnabled   Boolean    @default(true)
  rateLimitRequests  Int        @default(1000)
  rateLimitWindow    Int        @default(60)
  maintenanceMode    Boolean    @default(false)
  maintenanceMessage String?
  auditLevel         AuditLevel @default(STANDARD)
}

enum AuditLevel { MINIMAL, STANDARD, VERBOSE, DEBUG }
```

---

## Service Features (#400)

Hierarchical feature definitions with granular permissions.

```prisma
model ServiceFeature {
  id           String   @id
  serviceId    String
  code         String   // e.g., "POST_CREATE"
  category     String   // CONTENT, SOCIAL, COMMERCE
  parentId     String?  // For hierarchy
  path         String   // Materialized path: /content/post_create
  depth        Int      @default(1)
  isActive     Boolean  @default(true)
  isDefault    Boolean  @default(true)
}

model ServiceFeaturePermission {
  featureId  String
  targetType PermissionTargetType // ALL_USERS, USER, TIER, COUNTRY, ROLE
  targetId   String?              // null = all
  action     FeatureAction        // USE, CREATE, READ, UPDATE, DELETE, ADMIN
  isAllowed  Boolean  @default(true)
  conditions Json?                // { "tier": "premium", "country": ["KR"] }
  validFrom  DateTime?
  validUntil DateTime?
}
```

### Feature Categories

| Category | Features                                         |
| -------- | ------------------------------------------------ |
| CONTENT  | POST_CREATE, POST_EDIT, POST_DELETE, FILE_UPLOAD |
| SOCIAL   | COMMENT, CHAT, FOLLOW, LIKE, SHARE               |
| COMMERCE | PURCHASE, REVIEW, REFUND, COUPON                 |
| ACCOUNT  | PROFILE_EDIT, SETTINGS, WITHDRAW                 |

---

## Service Testers (#401)

Per-service tester management with bypass options.

```prisma
model ServiceTesterUser {
  serviceId    String
  userId       String
  bypassAll    Boolean   @default(false)
  bypassDomain Boolean   @default(true)
  bypassIP     Boolean   @default(true)
  bypassRate   Boolean   @default(false)
  expiresAt    DateTime?
}

model ServiceTesterAdmin {
  serviceId    String
  adminId      String
  bypassAll    Boolean   @default(false)
  bypassDomain Boolean   @default(true)
  expiresAt    DateTime?
}
```

### Bypass Options

| Option       | Description             | Default |
| ------------ | ----------------------- | ------- |
| bypassAll    | Skip ALL validations    | false   |
| bypassDomain | Skip domain validation  | true    |
| bypassIP     | Skip IP whitelist check | true    |
| bypassRate   | Skip rate limiting      | false   |

---

## Sanction Extensions (#402)

Extended sanction system with appeal workflow and notifications.

```prisma
model Sanction {
  // Scope
  scope              SanctionScope    @default(SERVICE) // PLATFORM, SERVICE
  severity           SanctionSeverity @default(MEDIUM)  // LOW, MEDIUM, HIGH, CRITICAL

  // Feature Restrictions
  restrictedFeatures String[]   @default([]) // ["POST_CREATE", "COMMENT"]

  // Details
  internalNote       String?
  evidenceUrls       String[]   @default([])
  relatedSanctionId  String?    // For follow-up sanctions

  // Issuer
  issuedByType       IssuerType @default(ADMIN) // ADMIN, OPERATOR, SYSTEM

  // Appeal
  appealStatus       AppealStatus? // PENDING, UNDER_REVIEW, APPROVED, REJECTED, ESCALATED
  appealedAt         DateTime?
  appealReason       String?
  appealReviewedBy   String?
  appealReviewedAt   DateTime?
  appealResponse     String?
}

model SanctionNotification {
  sanctionId String
  channel    NotificationChannel // EMAIL, PUSH, SMS, IN_APP
  status     NotificationStatus  // PENDING, SENT, DELIVERED, READ, FAILED
  sentAt     DateTime?
  readAt     DateTime?
}
```

### Appeal Workflow

```
SANCTION CREATED
     │
     ▼
User submits appeal → appealStatus: PENDING
     │
     ▼
Admin reviews → appealStatus: UNDER_REVIEW
     │
     ├─► APPROVED → status: REVOKED
     │
     ├─► REJECTED → appeal_response explains why
     │
     └─► ESCALATED → higher-level admin review
```

---

**Guides**: `docs/guides/OPERATOR_MANAGEMENT.md`, `docs/guides/ACCOUNT_LINKING.md`
