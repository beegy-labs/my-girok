# Identity Service

> Multi-app user management platform with Zero Migration architecture

## Purpose

Central identity platform for N apps with shared user management:

- **my-girok** (api.girok.dev)
- **vero** (api.vero.dev)
- Future apps...

---

## Architecture: Zero Migration

### Core Principle

**Combined Service, Pre-Separated DBs, Interface-Based Communication**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   identity-service (Single Deployment)                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        NestJS Application                         │  │
│  │  ┌─────────────┬─────────────────┬───────────────┐               │  │
│  │  │  Identity   │      Auth       │     Legal     │               │  │
│  │  │   Module    │     Module      │    Module     │               │  │
│  │  │             │                 │               │               │  │
│  │  │ - Accounts  │ - Roles         │ - Consents    │               │  │
│  │  │ - Sessions  │ - Permissions   │ - Documents   │               │  │
│  │  │ - Devices   │ - Operators     │ - Law Registry│               │  │
│  │  │ - Profiles  │ - Sanctions     │ - DSR         │               │  │
│  │  └──────┬──────┴────────┬────────┴───────┬───────┘               │  │
│  │         │ In-Process    │ In-Process     │ In-Process            │  │
│  └─────────┼───────────────┼────────────────┼───────────────────────┘  │
│            ▼               ▼                ▼                          │
│      identity_db       auth_db          legal_db  ← Pre-Separated      │
│            │               │                │                          │
│            └───────────────┼────────────────┘                          │
│                            ▼                                           │
│                     Outbox Tables → (Future: Redpanda CDC)             │
└─────────────────────────────────────────────────────────────────────────┘

                        ⬇️ Hardware Added (Zero Code Change)

┌─────────────────────────────────────────────────────────────────────────┐
│                    Separated Services (Same Interfaces)                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │ identity-svc    │   │    auth-svc     │   │   legal-svc     │       │
│  │ IIdentityModule │   │   IAuthModule   │   │  ILegalModule   │       │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘       │
│           │ gRPC               │ gRPC               │ gRPC            │
│           ▼                    ▼                    ▼                  │
│      identity_db           auth_db             legal_db ← Same DBs     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Zero Migration Guarantee

| Phase      | Services  | Communication | Event Broker | Code Change |
| ---------- | --------- | ------------- | ------------ | ----------- |
| 1 (Now)    | Combined  | In-Process    | Polling      | -           |
| 2 (Future) | Separated | gRPC          | Redpanda CDC | **None**    |

---

## SSOT (Single Source of Truth)

| Item              | Location                                    | Purpose                   |
| ----------------- | ------------------------------------------- | ------------------------- |
| Type Definitions  | `packages/types/src/identity/`              | Shared types & interfaces |
| Module Interfaces | `packages/types/src/identity/interfaces.ts` | Contract between modules  |
| Event Types       | `packages/types/src/events/`                | Domain event schema       |
| DB Schema         | `prisma/{module}/schema.prisma`             | Per-module Prisma         |
| DTO Enums         | `.prisma/*-client` (Prisma generated)       | Runtime enum values       |
| Constants         | `src/common/constants/index.ts`             | Service-specific config   |
| Masking Utils     | `src/common/utils/masking.util.ts`          | PII masking for logs      |
| Shared Utilities  | `@my-girok/nest-common`                     | CacheTTL, ID, Pagination  |

---

## Module Interfaces

> SSOT: `packages/types/src/identity/interfaces.ts`

| Interface           | DB          | Key Methods                                            |
| ------------------- | ----------- | ------------------------------------------------------ |
| `IIdentityModule`   | identity_db | accounts, sessions, devices, profiles                  |
| `IAuthModule`       | auth_db     | getActiveSanctions, hasPermission, getAccountRoles     |
| `ILegalModule`      | legal_db    | getAccountConsents, recordConsent, hasRequiredConsents |
| `IIdentityPlatform` | -           | Aggregates all 3 modules                               |

**Implementation Swap**: `env.IDENTITY_MODE=remote` switches Local → gRPC (zero code change)

---

## Data Isolation Patterns

| Pattern              | Phase                              | Description                             |
| -------------------- | ---------------------------------- | --------------------------------------- |
| Transactional Outbox | Now: Polling, Future: Debezium CDC | Each DB has `outbox_events` table       |
| Saga Orchestrator    | -                                  | Cross-DB transactions with compensation |
| API Composition      | -                                  | No cross-DB JOIN, use interfaces        |

**Saga Steps (Registration)**: Account → Profile → Consents → PublishEvent

---

## Outbox Pattern

### Transactional Methods (Recommended)

```typescript
// Use publishIn*Transaction for atomicity with business logic
await prisma.$transaction(async (tx) => {
  const account = await tx.account.create({ data });
  await outbox.publishInIdentityTransaction(tx, {
    aggregateType: 'Account',
    aggregateId: account.id,
    eventType: 'ACCOUNT_CREATED',
    payload: { ... }
  });
});
```

| Method                                    | Transaction     | Use Case                                  |
| ----------------------------------------- | --------------- | ----------------------------------------- |
| `publishInIdentityTransaction(tx, event)` | Within existing | Atomic with identity_db ops               |
| `publishInAuthTransaction(tx, event)`     | Within existing | Atomic with auth_db ops                   |
| `publishInLegalTransaction(tx, event)`    | Within existing | Atomic with legal_db ops                  |
| `publish(db, event)`                      | Standalone      | @deprecated - use in saga final step only |

### Saga Integration

Event publishing is the **final saga step** with retry and compensation:

- Retry: 3 attempts with exponential backoff (1s → 2s → 4s)
- Compensation: Events are NOT deleted (consumers handle gracefully)

**Detailed implementation**: `docs/policies/IDENTITY_PLATFORM.md`

---

## Module Responsibilities

### Identity Module (identity_db)

| Table           | Purpose             | Key Fields                                                    |
| --------------- | ------------------- | ------------------------------------------------------------- |
| `accounts`      | Core account + auth | id, email, username, status, mode, mfaEnabled, lockedUntil    |
| `sessions`      | Active sessions     | id, accountId, tokenHash, refreshTokenHash, expiresAt         |
| `devices`       | Registered devices  | id, accountId, fingerprint, deviceType, osVersion, appVersion |
| `profiles`      | User profiles       | id, accountId, displayName, gender, birthDate, address        |
| `outbox_events` | Event outbox        | id, eventType, payload, status, retryCount                    |

### Auth Module (auth_db)

| Table                    | Purpose                | Key Fields                            |
| ------------------------ | ---------------------- | ------------------------------------- |
| `roles`                  | Role definitions       | id, name, level, scope, parentId      |
| `permissions`            | Permission definitions | id, resource, action, category, scope |
| `role_permissions`       | Role-Permission join   | roleId, permissionId, conditions      |
| `operators`              | Service operators      | id, accountId, serviceId, roleId      |
| `operator_invitations`   | Invitation management  | id, email, token, expiresAt, status   |
| `operator_permissions`   | Direct permissions     | operatorId, permissionId, grantedBy   |
| `sanctions`              | Account sanctions      | id, subjectId, type, status, severity |
| `sanction_notifications` | Sanction notices       | id, sanctionId, channel, sentAt       |
| `outbox_events`          | Event outbox           | id, eventType, payload, status        |

### Legal Module (legal_db)

| Table              | Purpose           | Key Fields                 |
| ------------------ | ----------------- | -------------------------- |
| `legal_documents`  | Legal documents   | id, type, version, content |
| `consents`         | User consents     | id, accountId, consentType |
| `consent_logs`     | Consent audit log | id, consentId, action      |
| `law_registry`     | Law/regulation DB | id, code, countryCode      |
| `dsr_requests`     | GDPR DSR          | id, accountId, requestType |
| `dsr_request_logs` | DSR audit log     | id, requestId, action      |
| `outbox_events`    | Event outbox      | id, eventType, payload     |

---

## Code Structure

```
services/identity-service/
├── prisma/
│   ├── identity/schema.prisma    # identity_db only
│   ├── auth/schema.prisma        # auth_db only
│   └── legal/schema.prisma       # legal_db only
│
└── src/
    ├── database/                  # Multi-DB Prisma services
    │   ├── database.module.ts
    │   ├── base-prisma.service.ts # Base class + UUIDv7 extension
    │   ├── identity-prisma.service.ts
    │   ├── auth-prisma.service.ts
    │   └── legal-prisma.service.ts
    │
    ├── common/                    # Shared utilities
    │   ├── constants/             # Service-specific constants
    │   ├── pagination/            # PaginationDto, PaginatedResponse
    │   ├── saga/                  # Saga orchestrator
    │   ├── outbox/                # Transactional outbox
    │   ├── messaging/             # Kafka producer/consumer
    │   ├── guards/                # JWT, API key guards
    │   ├── filters/               # Exception filters
    │   ├── decorators/            # @Public, etc.
    │   └── utils/                 # Masking, etc.
    │
    ├── identity/                  # Identity module
    │   ├── identity.module.ts
    │   ├── accounts/              # Account CRUD, MFA
    │   ├── sessions/              # Session management
    │   ├── devices/               # Device registration
    │   └── profiles/              # User profiles
    │
    ├── auth/                      # Auth module
    │   ├── auth.module.ts
    │   ├── roles/                 # Role definitions, hierarchy
    │   ├── permissions/           # Permission CRUD, checks
    │   ├── operators/             # Operator management
    │   └── sanctions/             # User sanctions, appeals
    │
    ├── legal/                     # Legal module
    │   ├── legal.module.ts
    │   ├── consents/              # Consent management
    │   ├── legal-documents/       # Terms, policies
    │   ├── law-registry/          # Country-specific laws
    │   └── dsr-requests/          # GDPR DSR handling
    │
    └── composition/               # Cross-module workflows
        ├── registration/          # User registration saga
        └── account-deletion/      # GDPR deletion saga
```

---

## API Endpoints

### Public (No Auth)

```
POST   /registration              # User registration (saga)
```

### Identity Module

```
# Accounts
POST   /accounts                  # Create account
GET    /accounts                  # List accounts (paginated)
GET    /accounts/:id              # Get account by ID
GET    /accounts/external/:externalId  # Get by external ID (e.g., ACC_abc123)
GET    /accounts/by-email/:email  # Get account by email
GET    /accounts/by-username/:username  # Get account by username
PATCH  /accounts/:id              # Update account
DELETE /accounts/:id              # Soft delete account
POST   /accounts/:id/verify-email # Verify email
POST   /accounts/:id/change-password  # Change password (rate limited: 3/min)
PATCH  /accounts/:id/status       # Update account status
POST   /accounts/:id/mfa/enable   # Enable MFA (TOTP/SMS/EMAIL)
POST   /accounts/:id/mfa/verify   # Verify and complete MFA setup
POST   /accounts/:id/mfa/disable  # Disable MFA

# Sessions
POST   /sessions                  # Create session (rate: 10/min)
GET    /sessions                  # List sessions (paginated)
GET    /sessions/:id              # Get session by ID
POST   /sessions/refresh          # Refresh tokens (rate: 30/min)
POST   /sessions/validate         # Validate token (rate: 100/min)
POST   /sessions/:id/touch        # Update activity timestamp
DELETE /sessions/:id              # Revoke session
DELETE /sessions/account/:accountId # Revoke all sessions
GET    /sessions/account/:accountId/count # Active session count
POST   /sessions/cleanup          # Admin: cleanup expired (rate: 1/min)

# Devices
POST   /devices                   # Register device
GET    /devices/:id               # Get device by ID
GET    /devices/account/:accountId # List account devices
PATCH  /devices/:id               # Update device
DELETE /devices/:id               # Remove device
POST   /devices/:id/trust         # Trust device

# Profiles
GET    /profiles/:accountId       # Get profile
PATCH  /profiles/:accountId       # Update profile
```

### Auth Module

```
# Roles
GET    /roles                     # List roles
POST   /roles                     # Create role
GET    /roles/:id                 # Get role by ID
PATCH  /roles/:id                 # Update role
DELETE /roles/:id                 # Delete role
GET    /roles/:id/permissions     # Get role permissions
POST   /roles/:id/permissions     # Assign permissions
DELETE /roles/:id/permissions     # Revoke permissions

# Permissions
GET    /permissions               # List permissions
POST   /permissions               # Create permission
GET    /permissions/:id           # Get permission by ID
PATCH  /permissions/:id           # Update permission
DELETE /permissions/:id           # Delete permission
GET    /permissions/categories    # Get by category

# Operators
POST   /operators/invitations     # Create invitation
POST   /operators/accept          # Accept invitation
POST   /operators/direct          # Create directly
GET    /operators/:id             # Get operator
PATCH  /operators/:id             # Update operator
DELETE /operators/:id             # Deactivate operator
GET    /operators                 # List operators

# Sanctions
POST   /sanctions                 # Create sanction
GET    /sanctions/:id             # Get sanction by ID
PATCH  /sanctions/:id             # Update sanction
POST   /sanctions/:id/revoke      # Revoke sanction
POST   /sanctions/:id/appeal      # Submit appeal
GET    /sanctions                 # List sanctions
```

### Legal Module

```
# Consents
POST   /consents                  # Grant consent
POST   /consents/bulk             # Grant bulk consents
DELETE /consents/:id              # Withdraw consent
GET    /consents/:id              # Get consent by ID
GET    /consents/account/:accountId # Get account consents
GET    /consents                  # List consents

# Legal Documents
POST   /legal-documents           # Create document
GET    /legal-documents/:id       # Get by ID
GET    /legal-documents/current   # Get current version
GET    /legal-documents           # List documents

# Law Registry
POST   /law-registry              # Create law entry
GET    /law-registry/:id          # Get by ID
GET    /law-registry/code/:code   # Get by code
GET    /law-registry/country/:code # Get by country
GET    /law-registry              # List laws
PATCH  /law-registry/:code        # Update law

# DSR Requests
POST   /dsr-requests              # Create DSR request
GET    /dsr-requests/:id          # Get by ID
PATCH  /dsr-requests/:id          # Update request
POST   /dsr-requests/:id/complete # Complete request
GET    /dsr-requests              # List requests
```

### Composition Layer

```
POST   /registration              # User registration saga
POST   /account-deletion/immediate # Immediate deletion
POST   /account-deletion/schedule  # Scheduled deletion
```

---

## Event Types

> SSOT: `packages/types/src/events/` (SCREAMING_SNAKE_CASE)

```typescript
// Identity Events
'ACCOUNT_CREATED';
'ACCOUNT_UPDATED';
'ACCOUNT_DELETED';
'SESSION_STARTED';
'SESSION_ENDED';
'DEVICE_REGISTERED';
'DEVICE_TRUSTED';
'MFA_ENABLED';
'MFA_DISABLED';

// Auth Events
'ROLE_ASSIGNED';
'ROLE_REVOKED';
'SANCTION_APPLIED';
'SANCTION_REVOKED';
'SANCTION_APPEALED';

// Legal Events
'CONSENT_GRANTED';
'CONSENT_WITHDRAWN';
'DSR_REQUEST_SUBMITTED';
'DSR_REQUEST_COMPLETED';
```

---

## Environment Variables

```env
PORT=3005
NODE_ENV=development

# DBs (Pre-Separated - Zero Migration Ready)
IDENTITY_DATABASE_URL=postgresql://...identity_db
AUTH_DATABASE_URL=postgresql://...auth_db
LEGAL_DATABASE_URL=postgresql://...legal_db

# Module Mode (Combined → Separated)
IDENTITY_MODE=local    # local | remote (gRPC)
AUTH_MODE=local
LEGAL_MODE=local

# gRPC URLs (when MODE=remote)
IDENTITY_GRPC_URL=identity-service:50051
AUTH_GRPC_URL=auth-service:50051
LEGAL_GRPC_URL=legal-service:50051

# Future: Redpanda (Kafka-compatible)
REDPANDA_BROKERS=      # Empty = use polling
REDPANDA_ENABLED=false

# JWT
JWT_SECRET=...
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=14d
```

---

## Rate Limiting

| Endpoint                             | Limit | TTL | Reason                    |
| ------------------------------------ | ----- | --- | ------------------------- |
| `POST /sessions`                     | 10    | 60s | Prevent session flood     |
| `POST /sessions/refresh`             | 30    | 60s | Allow reasonable refresh  |
| `POST /sessions/validate`            | 100   | 60s | High-frequency validation |
| `POST /sessions/cleanup`             | 1     | 60s | Admin operation           |
| `POST /accounts/:id/change-password` | 3     | 60s | Prevent brute force       |

Uses `@Throttle` decorator from `@nestjs/throttler`.

---

## Security

### Triple-Layer Access Control

| Layer            | Can Disable? | Notes                      |
| ---------------- | ------------ | -------------------------- |
| Domain (Layer 1) | Yes          | Dev/staging                |
| JWT (Layer 2)    | **NO**       | Always required (RFC 9068) |
| Header (Layer 3) | Yes          | Internal tools             |

### Security Levels

| Level    | Domain | JWT | Header | Use Case    |
| -------- | ------ | --- | ------ | ----------- |
| STRICT   | ✅     | ✅  | ✅     | Production  |
| STANDARD | ❌     | ✅  | ✅     | Staging     |
| RELAXED  | ❌     | ✅  | ❌     | Development |

### MFA & Account Security

- **MFA Methods**: TOTP (RFC 6238), SMS, EMAIL
- **Lockout**: 5 failed attempts → 15min lock
- **Fields**: `mfaEnabled`, `failedLoginAttempts`, `lockedUntil`

---

## 2025 Best Practices

| Standard             | Status | Implementation                      |
| -------------------- | ------ | ----------------------------------- |
| RFC 9700 (OAuth 2.0) | ✅     | PKCE, no implicit                   |
| RFC 9068 (JWT)       | ✅     | `aud` claim, RS256                  |
| RFC 9562 (UUIDv7)    | ✅     | All IDs via `ID.generate()`         |
| Transactional Outbox | ✅     | Per-DB outbox, Redpanda-ready       |
| Saga Pattern         | ✅     | Registration, Account Deletion      |
| API Composition      | ✅     | No cross-DB JOIN                    |
| SSOT                 | ✅     | Types in `packages/types`           |
| CacheTTL             | ✅     | `@my-girok/nest-common` CacheTTL    |
| Token Hashing        | ✅     | refreshTokenHash (SHA-256)          |
| PII Masking          | ✅     | `masking.util.ts` for all logs      |
| Error Sanitization   | ✅     | No IDs in error messages            |
| DTO SSOT             | ✅     | Enums from Prisma generated clients |

---

## Constants Reference

> **SSOT**: `src/common/constants/index.ts`
> **Strategy**: [.ai/ssot.md](../ssot.md#backend-constants--utilities)

| Category            | Purpose          | Key Constants                                     |
| ------------------- | ---------------- | ------------------------------------------------- |
| `SESSION`           | Token expiry     | `DEFAULT_EXPIRY_MINUTES`, `REFRESH_TOKEN_DAYS`    |
| `RATE_LIMIT`        | Auth protection  | `LOGIN_LIMIT`, `REGISTRATION_LIMIT`               |
| `MFA`               | TOTP/Backup      | `TOTP_WINDOW`, `BACKUP_CODES_COUNT`               |
| `ACCOUNT_SECURITY`  | Lockout          | `MAX_FAILED_ATTEMPTS`, `LOCKOUT_DURATION_MINUTES` |
| `DSR_DEADLINE_DAYS` | GDPR/CCPA/PIPA   | Per-law deadline days                             |
| `OUTBOX`            | Event processing | `POLL_INTERVAL_MS`, `BATCH_SIZE`                  |
| `SANCTION`          | User bans        | `DEFAULT_DURATION_DAYS`, `APPEAL_WINDOW_DAYS`     |

**Detailed values**: See `src/common/constants/index.ts` or `docs/services/IDENTITY_SERVICE.md`

---

## Guards & Security

### ApiKeyGuard

> Location: `src/common/guards/api-key.guard.ts`

Service-to-service authentication with timing-safe comparison:

```typescript
// Usage: @UseGuards(ApiKeyGuard)
// Header: X-API-Key: <api-key>
// Env: API_KEYS=key1,key2,key3
```

| Feature      | Implementation                   |
| ------------ | -------------------------------- |
| Hash Storage | SHA-256, keys never stored plain |
| Comparison   | `crypto.timingSafeEqual()`       |
| Cache        | 1 minute TTL, auto-refresh       |
| Production   | Required - throws if empty       |

### @Public Decorator

```typescript
@Public()  // Skip API key validation
@Get('health')
health() { return { status: 'ok' }; }
```

---

## Crypto Service

> Location: `src/common/crypto/crypto.service.ts`

| Method                 | Algorithm          | Use Case         |
| ---------------------- | ------------------ | ---------------- |
| `encrypt(plaintext)`   | AES-256-GCM        | MFA secrets      |
| `decrypt(ciphertext)`  | AES-256-GCM        | MFA verification |
| `hash(data)`           | SHA-256            | Backup codes     |
| `generateToken(bytes)` | crypto.randomBytes | API tokens       |
| `generateTotpSecret()` | Base32 (OTPAuth)   | TOTP setup       |

**Ciphertext format**: `iv:authTag:encryptedData` (Base64)

**Env**: `ENCRYPTION_KEY` (32 bytes, Base64 encoded)

---

## PII Masking Utilities

> Location: `src/common/utils/masking.util.ts`

| Function                 | Input                                  | Output                                 |
| ------------------------ | -------------------------------------- | -------------------------------------- |
| `maskUuid(uuid)`         | `550e8400-e29b-41d4-a716-446655440000` | `550e8400-****-****-****-********0000` |
| `maskEmail(email)`       | `user@example.com`                     | `us***@example.com`                    |
| `maskIpAddress(ip)`      | `192.168.1.100`                        | `192.168.*.*`                          |
| `maskToken(token)`       | `abc123...xyz789`                      | `abc123...`                            |
| `maskSensitiveData(obj)` | `{ password: 'secret' }`               | `{ password: '[REDACTED]' }`           |

**Default sensitive fields**: `password`, `token`, `secret`, `mfaSecret`, `refreshToken`

---

## Migration Roadmap

| Phase       | Trigger        | Changes                          |
| ----------- | -------------- | -------------------------------- |
| 1 (Current) | -              | Combined service, polling outbox |
| 2           | Hardware added | Extract services, enable gRPC    |
| 3           | Scale needed   | Add Redpanda + Debezium CDC      |
| 4           | Global scale   | Multi-region, read replicas      |

---

**Detailed policy**: `docs/policies/IDENTITY_PLATFORM.md`
