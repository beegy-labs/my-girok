# Identity Service

> Core identity management: accounts, sessions, devices, profiles

## Purpose

Central identity platform for account management across apps:

- Account lifecycle (create, update, delete)
- Session management (JWT tokens)
- Device registration and trust
- User profiles

**Note**: Auth (roles, permissions, operators, sanctions) and Legal (consents, DSR) are handled by separate services.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    identity-service                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │              NestJS Application                  │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │           Identity Module                │    │   │
│  │  │                                          │    │   │
│  │  │  - Accounts (CRUD, MFA, verification)   │    │   │
│  │  │  - Sessions (token management)          │    │   │
│  │  │  - Devices (registration, trust)        │    │   │
│  │  │  - Profiles (user info)                 │    │   │
│  │  └──────────────────┬──────────────────────┘    │   │
│  │                     │                           │   │
│  └─────────────────────┼───────────────────────────┘   │
│                        ▼                                │
│                   identity_db                           │
│                        │                                │
│                        ▼                                │
│              Outbox → Redpanda (CDC)                   │
└─────────────────────────────────────────────────────────┘
```

---

## Related Services

| Service         | Domain                             | Communication |
| --------------- | ---------------------------------- | ------------- |
| `auth-service`  | Roles, permissions, operators      | gRPC/HTTP     |
| `legal-service` | Consents, legal docs, DSR requests | gRPC/HTTP     |

---

## Database Schema

> Single database: `identity_db`

### Core Tables

| Table      | Purpose             | Key Fields                                                 |
| ---------- | ------------------- | ---------------------------------------------------------- |
| `accounts` | Core account + auth | id, email, username, status, mode, mfaEnabled, lockedUntil |
| `sessions` | Active sessions     | id, accountId, tokenHash, refreshTokenHash, expiresAt      |
| `devices`  | Registered devices  | id, accountId, fingerprint, isActive, pushTokenHash        |
| `profiles` | User profiles       | id, accountId, displayName, locale, timezone, metadata     |

### Security Tables

| Table              | Purpose                  | Key Fields                                   |
| ------------------ | ------------------------ | -------------------------------------------- |
| `revoked_tokens`   | JWT blacklist (RFC 9068) | jti, accountId, reason, revokedAt, expiresAt |
| `mfa_backup_codes` | Hashed backup codes      | id, accountId, codeHash, usedAt              |
| `password_history` | Password reuse prevent   | id, accountId, passwordHash, changedAt       |

### Event Infrastructure

| Table                | Purpose              | Key Fields                                 |
| -------------------- | -------------------- | ------------------------------------------ |
| `outbox_events`      | Transactional outbox | id, eventType, payload, status, retryCount |
| `dead_letter_events` | Failed event DLQ     | id, originalEventId, failureReason, status |

---

## Code Structure

```
services/identity-service/
├── prisma/
│   └── identity/schema.prisma    # identity_db schema
│
├── migrations/
│   └── identity/                 # Goose migrations
│
└── src/
    ├── database/
    │   ├── database.module.ts
    │   └── identity-prisma.service.ts
    │
    ├── common/
    │   ├── constants/             # Service-specific constants
    │   ├── pagination/            # PaginationDto, PaginatedResponse
    │   ├── saga/                  # Saga orchestrator + RedisSagaStateStore
    │   ├── outbox/                # Transactional outbox + DlqService
    │   ├── messaging/             # Kafka producer/consumer
    │   ├── cache/                 # Valkey/Redis caching
    │   ├── crypto/                # CryptoService (Argon2id, AES-256-GCM)
    │   ├── metrics/               # Prometheus metrics
    │   ├── guards/                # JWT, API key, Permission guards
    │   ├── filters/               # Exception filters
    │   ├── decorators/            # @Public, @Permissions, @CurrentUser
    │   └── utils/                 # Masking, etc.
    │
    ├── identity/
    │   ├── identity.module.ts
    │   ├── accounts/              # Account CRUD, MFA
    │   ├── sessions/              # Session management
    │   ├── devices/               # Device registration
    │   └── profiles/              # User profiles
    │
    └── health/                    # Health checks
```

---

## API Endpoints

### Accounts

```
POST   /v1/accounts                      # Create account
GET    /v1/accounts                      # List accounts (paginated)
GET    /v1/accounts/:id                  # Get account by ID
GET    /v1/accounts/external/:externalId # Get by external ID
GET    /v1/accounts/by-email/:email      # Get account by email
GET    /v1/accounts/by-username/:username # Get account by username
PATCH  /v1/accounts/:id                  # Update account
DELETE /v1/accounts/:id                  # Soft delete account
POST   /v1/accounts/:id/verify-email     # Verify email
POST   /v1/accounts/:id/change-password  # Change password
PATCH  /v1/accounts/:id/status           # Update account status
POST   /v1/accounts/:id/mfa/enable       # Enable MFA
POST   /v1/accounts/:id/mfa/verify       # Verify MFA setup
POST   /v1/accounts/:id/mfa/disable      # Disable MFA
```

### Sessions

```
POST   /v1/sessions                      # Create session
GET    /v1/sessions                      # List sessions (paginated)
GET    /v1/sessions/:id                  # Get session by ID
POST   /v1/sessions/refresh              # Refresh tokens
POST   /v1/sessions/validate             # Validate token
POST   /v1/sessions/:id/touch            # Update activity timestamp
DELETE /v1/sessions/:id                  # Revoke session
DELETE /v1/sessions/account/:accountId   # Revoke all sessions
GET    /v1/sessions/account/:accountId/count # Active session count
```

### Devices

```
POST   /v1/devices                       # Register device
GET    /v1/devices/:id                   # Get device by ID
GET    /v1/devices/account/:accountId    # List account devices
PATCH  /v1/devices/:id                   # Update device
DELETE /v1/devices/:id                   # Remove device
POST   /v1/devices/:id/trust             # Trust device
```

### Profiles

```
GET    /v1/profiles/:accountId           # Get profile
PATCH  /v1/profiles/:accountId           # Update profile
```

### Health & Metrics

```
GET    /health                           # Basic health check
GET    /health/live                      # Kubernetes liveness
GET    /health/ready                     # Kubernetes readiness
GET    /health/detailed                  # Detailed health
GET    /metrics                          # Prometheus metrics
```

---

## Event Types

> Published to Kafka/Redpanda via Transactional Outbox

```typescript
'ACCOUNT_CREATED';
'ACCOUNT_UPDATED';
'ACCOUNT_DELETED';
'SESSION_STARTED';
'SESSION_ENDED';
'DEVICE_REGISTERED';
'DEVICE_TRUSTED';
'MFA_ENABLED';
'MFA_DISABLED';
```

---

## Environment Variables

```env
PORT=3005
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...identity_db

# JWT
JWT_SECRET=...
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=14d

# Valkey/Redis
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=
VALKEY_DB=0

# Security
BCRYPT_ROUNDS=12
ACCOUNT_LOCK_THRESHOLD=5
ACCOUNT_LOCK_DURATION_MINUTES=15
ENCRYPTION_KEY=... # 32 bytes for AES-256-GCM

# API Keys (service-to-service)
API_KEYS=key1,key2

# Kafka/Redpanda (optional)
REDPANDA_BROKERS=
REDPANDA_ENABLED=false
```

---

## Rate Limiting

| Endpoint                              | Limit | TTL | Reason                   |
| ------------------------------------- | ----- | --- | ------------------------ |
| `GET /accounts/by-email/:email`       | 5     | 60s | Prevent user enumeration |
| `GET /accounts/by-username/:username` | 5     | 60s | Prevent user enumeration |
| `POST /sessions`                      | 10    | 60s | Prevent session flood    |
| `POST /sessions/refresh`              | 30    | 60s | Reasonable refresh       |
| `POST /sessions/validate`             | 100   | 60s | High-frequency           |
| `POST /accounts/:id/change-password`  | 3     | 60s | Prevent brute force      |
| `POST /accounts/:id/mfa/disable`      | 3     | 60s | Prevent MFA bypass       |
| `POST /devices`                       | 10    | 60s | Prevent device flood     |

---

## Security

### Password Hashing (OWASP 2024)

- **Algorithm**: Argon2id (not bcrypt)
- **Parameters**: memoryCost=47104 KiB, timeCost=1, parallelism=1
- **Password History**: Separate table prevents reuse

### MFA & Account Security

- **MFA Methods**: TOTP (RFC 6238), SMS, EMAIL
- **Backup Codes**: Separate table, bcrypt hashed, single-use tracking
- **Lockout**: 5 failed attempts → 15min lock
- **Disable MFA**: Requires password verification

### Token Security (RFC 9068)

- **Access tokens**: Short-lived (1h), includes `jti` claim
- **Refresh tokens**: SHA-256 hashed, rotation detection
- **Token Revocation**: JTI blacklist with cache-aside pattern
- **Session binding**: IP subnet (/24 IPv4, /64 IPv6) + User-Agent

### Token Revocation

```typescript
// Check revocation (cache → DB fallback)
const isRevoked = await jwtGuard.isTokenRevoked(jti);

// Revoke token (logout, security event)
await jwtGuard.revokeToken(jti, accountId, 'logout');
```

### Permission Guard

```typescript
// Require specific permission
@Permissions('accounts:read')

// Require any of multiple permissions
@RequireAnyPermission('accounts:read', 'accounts:admin')

// Wildcard support
@Permissions('accounts:*')  // Any action on accounts
```

### PII Masking

All logs use `masking.util.ts` for:

- UUID masking: `550e8400-****-****-****-********0000`
- Email masking: `us***@example.com`
- IP masking: `192.168.*.*` (IPv4), `2001:db8:****:****` (IPv6)

---

## 2025 Best Practices

| Standard             | Status | Implementation              |
| -------------------- | ------ | --------------------------- |
| RFC 9068 (JWT)       | ✅     | `aud` claim, RS256          |
| RFC 9562 (UUIDv7)    | ✅     | All IDs via `ID.generate()` |
| Transactional Outbox | ✅     | Redpanda-ready              |
| Token Hashing        | ✅     | refreshTokenHash (SHA-256)  |
| PII Masking          | ✅     | `masking.util.ts`           |
| Error Sanitization   | ✅     | No IDs in error messages    |

---

## Outbox Pattern

```typescript
// Transactional publish (recommended)
await prisma.$transaction(async (tx) => {
  const account = await tx.account.create({ data });
  await outbox.publishInTransaction(tx, {
    aggregateType: 'Account',
    aggregateId: account.id,
    eventType: 'ACCOUNT_CREATED',
    payload: { ... }
  });
});
```

### Dead Letter Queue (DLQ)

Failed events after max retries (5) are moved to DLQ:

```typescript
// Move to DLQ
await dlqService.moveToDlq({
  originalEventId: event.id,
  aggregateType: 'Account',
  eventType: 'ACCOUNT_CREATED',
  failureReason: 'Kafka broker unavailable',
  retryCount: 5,
});

// Manage DLQ events
await dlqService.retryEvent(id, 'operator@email.com');
await dlqService.resolveEvent(id, 'operator', 'Fixed manually');
await dlqService.ignoreEvent(id, 'operator', 'Obsolete data');

// Cleanup: Auto-deletes resolved/ignored events after 30 days
```

---

## Saga Pattern (Distributed Transactions)

Redis-backed state persistence for multi-step operations:

```typescript
const saga = await sagaOrchestrator.execute<AccountRegistrationContext>({
  sagaId: `registration-${accountId}`,
  steps: [
    {
      name: 'createAccount',
      execute: async (ctx) => {
        /* create account */
      },
      compensate: async (ctx) => {
        /* rollback */
      },
    },
    {
      name: 'createProfile',
      execute: async (ctx) => {
        /* create profile */
      },
      compensate: async (ctx) => {
        /* rollback */
      },
    },
  ],
});
```

### Saga State Store

- **Storage**: Redis/Valkey with TTL
- **Running sagas**: 24-hour TTL
- **Completed sagas**: 1-hour TTL
- **Recovery**: Query by status for stale saga detection

---

## Entity Classes

Domain entities with sensitive field masking:

```typescript
// Session entity - masks token hashes
const session = SessionEntity.fromPrisma(prismaSession);
session.toSafeJSON(); // tokenHash: '****'

// Profile entity - calculates age
const profile = ProfileEntity.fromPrisma(prismaProfile);
profile.calculateAge(); // 25

// Device entity - trust level computation
const device = DeviceEntity.fromPrisma(prismaDevice);
device.getTrustLevel(); // 'high' | 'medium' | 'low'
```

---

**Detailed docs**: `docs/services/IDENTITY_SERVICE.md`
