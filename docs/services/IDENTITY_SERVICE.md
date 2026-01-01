# Identity Service

> Core identity management for the my-girok platform

## Overview

The Identity Service manages the core identity lifecycle for user accounts across multiple applications. It handles account creation, session management, device registration, and user profiles.

**Key Responsibilities:**

- Account lifecycle (create, update, delete, verification)
- Session management (JWT tokens, refresh)
- Device registration and trust
- User profiles

**Note**: Authorization (roles, permissions) is handled by `auth-service`. Legal compliance (consents, DSR) is handled by `legal-service`.

## Architecture

### Single Database Design

```
┌─────────────────────────────────────────────────────────────┐
│                    identity-service                          │
├─────────────────────────────────────────────────────────────┤
│                        identity_db                           │
├─────────────────────────────────────────────────────────────┤
│ • accounts       - Core account data, MFA settings           │
│ • sessions       - Active JWT sessions                       │
│ • devices        - Registered devices, trust levels          │
│ • profiles       - User profile information                  │
│ • outbox_events  - Transactional outbox for events           │
└─────────────────────────────────────────────────────────────┘
```

### Related Services

| Service         | Domain                             | Communication |
| --------------- | ---------------------------------- | ------------- |
| `auth-service`  | Roles, permissions, operators      | gRPC/HTTP     |
| `legal-service` | Consents, legal docs, DSR requests | gRPC/HTTP     |

## Database Schema

### Accounts Table

Core account information with MFA support:

| Column              | Type         | Description                             |
| ------------------- | ------------ | --------------------------------------- |
| id                  | UUID (v7)    | Primary key, time-sorted                |
| email               | VARCHAR(255) | Unique, required                        |
| username            | VARCHAR(50)  | Unique, optional                        |
| passwordHash        | VARCHAR(255) | Argon2id hashed (OWASP 2024)            |
| status              | ENUM         | ACTIVE, SUSPENDED, PENDING_VERIFICATION |
| mode                | ENUM         | STANDALONE, UNIFIED                     |
| mfaEnabled          | BOOLEAN      | MFA status                              |
| mfaSecret           | TEXT         | Encrypted TOTP secret (AES-256-GCM)     |
| failedLoginAttempts | INTEGER      | Counter for lockout                     |
| lockedUntil         | TIMESTAMP    | Lockout expiry                          |
| emailVerified       | BOOLEAN      | Email verification status               |
| lastFailedLoginAt   | TIMESTAMP    | Last failed login timestamp             |
| lastSuccessLoginAt  | TIMESTAMP    | Last successful login timestamp         |
| lastLoginIp         | INET         | Last login IP address                   |
| createdAt           | TIMESTAMP    | Creation timestamp                      |
| updatedAt           | TIMESTAMP    | Last update timestamp                   |

### Sessions Table

Active user sessions with token hashing:

| Column                   | Type      | Description                   |
| ------------------------ | --------- | ----------------------------- |
| id                       | UUID (v7) | Primary key                   |
| accountId                | UUID      | Foreign key to accounts       |
| tokenHash                | VARCHAR   | SHA-256 hash of access token  |
| refreshTokenHash         | VARCHAR   | SHA-256 hash of refresh token |
| previousRefreshTokenHash | VARCHAR   | For token rotation detection  |
| userAgent                | VARCHAR   | Client user agent             |
| ipAddress                | INET      | Client IP address             |
| expiresAt                | TIMESTAMP | Session expiry                |
| lastActivityAt           | TIMESTAMP | Last activity timestamp       |

### Devices Table

Registered devices with trust management:

| Column        | Type         | Description                      |
| ------------- | ------------ | -------------------------------- |
| id            | UUID (v7)    | Primary key                      |
| accountId     | UUID         | Foreign key to accounts          |
| fingerprint   | VARCHAR(255) | Device fingerprint hash          |
| deviceType    | ENUM         | MOBILE, TABLET, DESKTOP, BROWSER |
| osVersion     | VARCHAR(50)  | Operating system version         |
| appVersion    | VARCHAR(20)  | Application version              |
| isTrusted     | BOOLEAN      | Trust status                     |
| isActive      | BOOLEAN      | Active/inactive status           |
| pushTokenHash | VARCHAR(64)  | Hashed push notification token   |
| lastUsedAt    | TIMESTAMP    | Last activity timestamp          |
| lastIpAddress | INET         | Last known IP address            |
| deletedAt     | TIMESTAMP    | Soft delete timestamp            |

### Profiles Table

User profile information:

| Column      | Type         | Description                            |
| ----------- | ------------ | -------------------------------------- |
| id          | UUID (v7)    | Primary key                            |
| accountId   | UUID         | Foreign key to accounts                |
| displayName | VARCHAR(100) | Display name                           |
| gender      | ENUM         | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY |
| birthDate   | DATE         | Date of birth                          |
| address     | JSON         | Address information                    |
| avatarUrl   | VARCHAR(500) | Profile picture URL                    |
| locale      | VARCHAR(10)  | User locale preference (e.g., ko-KR)   |
| timezone    | VARCHAR(50)  | User timezone (e.g., Asia/Seoul)       |
| metadata    | JSON         | Additional user metadata               |
| deletedAt   | TIMESTAMP    | Soft delete timestamp                  |

### Security Tables

#### Revoked Tokens (JWT Blacklist)

| Column    | Type      | Description              |
| --------- | --------- | ------------------------ |
| id        | UUID (v7) | Primary key              |
| jti       | VARCHAR   | JWT ID (unique, indexed) |
| accountId | UUID      | Foreign key to accounts  |
| reason    | VARCHAR   | Revocation reason        |
| revokedAt | TIMESTAMP | When token was revoked   |
| expiresAt | TIMESTAMP | Original token expiry    |

#### MFA Backup Codes

| Column    | Type      | Description                   |
| --------- | --------- | ----------------------------- |
| id        | UUID (v7) | Primary key                   |
| accountId | UUID      | Foreign key to accounts       |
| codeHash  | VARCHAR   | bcrypt hashed backup code     |
| usedAt    | TIMESTAMP | When code was used (nullable) |
| createdAt | TIMESTAMP | Creation timestamp            |

#### Password History

| Column       | Type      | Description              |
| ------------ | --------- | ------------------------ |
| id           | UUID (v7) | Primary key              |
| accountId    | UUID      | Foreign key to accounts  |
| passwordHash | VARCHAR   | Argon2id hashed password |
| changedAt    | TIMESTAMP | When password was set    |

### Event Infrastructure Tables

#### Outbox Events

| Column         | Type      | Description                            |
| -------------- | --------- | -------------------------------------- |
| id             | UUID (v7) | Primary key                            |
| aggregateType  | VARCHAR   | Entity type (Account, Session, etc.)   |
| aggregateId    | UUID      | Entity ID                              |
| eventType      | VARCHAR   | Event type (ACCOUNT_CREATED, etc.)     |
| payload        | JSON      | Event payload                          |
| status         | ENUM      | PENDING, PROCESSING, COMPLETED, FAILED |
| retryCount     | INTEGER   | Number of retry attempts               |
| lastError      | TEXT      | Last error message                     |
| nextRetryAt    | TIMESTAMP | Next retry timestamp                   |
| idempotencyKey | VARCHAR   | Deterministic hash for deduplication   |

#### Dead Letter Events

| Column          | Type      | Description                         |
| --------------- | --------- | ----------------------------------- |
| id              | UUID (v7) | Primary key                         |
| originalEventId | UUID      | Reference to original event         |
| aggregateType   | VARCHAR   | Entity type                         |
| aggregateId     | UUID      | Entity ID                           |
| eventType       | VARCHAR   | Event type                          |
| payload         | JSON      | Event payload                       |
| failureReason   | TEXT      | Why event failed                    |
| retryCount      | INTEGER   | Number of attempts before DLQ       |
| originalTopic   | VARCHAR   | Kafka topic                         |
| status          | ENUM      | PENDING, RETRIED, RESOLVED, IGNORED |
| processedAt     | TIMESTAMP | When event was processed            |
| processedBy     | VARCHAR   | Who processed the event             |
| resolution      | TEXT      | Resolution notes                    |

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

### Health

```
GET    /health                           # Basic health check
GET    /health/live                      # Kubernetes liveness
GET    /health/ready                     # Kubernetes readiness
GET    /health/detailed                  # Detailed health
GET    /metrics                          # Prometheus metrics
```

## Security

### Password Hashing (OWASP 2024)

Using Argon2id with OWASP-recommended parameters:

```typescript
// Argon2id parameters (OWASP 2024)
{
  memoryCost: 47104,  // 46 MiB
  timeCost: 1,
  parallelism: 1
}
```

Password history is tracked in a separate table to prevent reuse.

### MFA Implementation

MFA secrets are encrypted at rest using AES-256-GCM:

```typescript
// Encryption format: iv:authTag:encryptedData (base64)
const encryptedSecret = cryptoService.encrypt(totpSecret);
```

Set `ENCRYPTION_KEY` environment variable (32 bytes, base64 encoded).

**MFA Backup Codes**: Stored in separate table with bcrypt hashing. Single-use tracking via `usedAt` timestamp.

**Disable MFA**: Requires current password verification to prevent unauthorized disabling.

### Token Security (RFC 9068)

- **Access tokens**: Short-lived (1 hour), includes `jti` (JWT ID) claim
- **Refresh tokens**: SHA-256 hashed before storage
- **Token rotation**: `previousRefreshTokenHash` detects token reuse attacks
- **Session binding**: IP subnet (/24 IPv4, /64 IPv6) + User-Agent validation

### Token Revocation

JWT tokens can be revoked before expiry using JTI blacklist:

```typescript
// Revoke token on logout or security event
await jwtAuthGuard.revokeToken(jti, accountId, 'logout');

// Check is performed automatically on every authenticated request
// Uses cache-aside pattern: Redis cache (1 hour TTL) → Database fallback
```

| Cache Key Pattern     | TTL    | Description       |
| --------------------- | ------ | ----------------- |
| `token:revoked:{jti}` | 1 hour | Revocation status |

### Permission Guard

Fine-grained permission control with wildcard support:

```typescript
// Require specific permission
@Permissions('accounts:read')
@Get(':id')
findOne(@Param('id') id: string) { ... }

// Require any of multiple permissions
@RequireAnyPermission('accounts:read', 'accounts:admin')
@Get()
findAll() { ... }

// Wildcard permissions
@Permissions('accounts:*')  // Any action on accounts
@Permissions('*:read')      // Read action on any resource
@Permissions('*')           // Super admin
```

### Account Lockout

- 5 failed attempts triggers lockout
- 15-minute lockout duration
- Configurable via environment variables
- Last failed login timestamp tracked

### PII Masking

All logs use masking utilities:

```typescript
import { maskUuid, maskEmail, maskIpAddress } from './common/utils/masking.util';

this.logger.log(`Account created: ${maskUuid(accountId)}`);
// Output: Account created: 550e8400-****-****-****-********0000
```

| Function          | Example Input                          | Example Output                           |
| ----------------- | -------------------------------------- | ---------------------------------------- |
| `maskUuid()`      | `550e8400-e29b-41d4-a716-446655440000` | `550e8400-****-****-****-********0000`   |
| `maskEmail()`     | `user@example.com`                     | `us***@example.com`                      |
| `maskIpAddress()` | `192.168.1.100`                        | `192.168.*.*`                            |
| `maskIpAddress()` | `2001:db8:85a3::8a2e:370:7334`         | `2001:db8:****:****:****:****:****:****` |

## Event-Driven Architecture

### Kafka Topics (Redpanda)

| Topic                        | Description              |
| ---------------------------- | ------------------------ |
| `identity.account.created`   | New account registration |
| `identity.account.updated`   | Account data changes     |
| `identity.account.deleted`   | Account deletion         |
| `identity.session.started`   | New session              |
| `identity.session.ended`     | Session termination      |
| `identity.device.registered` | Device registration      |
| `identity.device.trusted`    | Device trust granted     |
| `identity.mfa.enabled`       | MFA enabled              |
| `identity.mfa.disabled`      | MFA disabled             |

### Transactional Outbox Pattern

Events are stored in `outbox_events` table and processed by cron job:

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

**Outbox Features:**

- Idempotency keys (deterministic hashing) prevent duplicate events
- Exponential backoff with jitter for retries
- Atomic claim/process mechanism for distributed workers
- Status tracking: PENDING → PROCESSING → COMPLETED/FAILED

### Dead Letter Queue (DLQ)

Failed events (after 5 retries) are moved to the Dead Letter Queue:

```typescript
// Events automatically moved to DLQ after max retries
// Manual management via DlqService:

// Retry failed event
await dlqService.retryEvent(eventId, 'operator@email.com');

// Mark as resolved (fixed externally)
await dlqService.resolveEvent(eventId, 'operator', 'Database restored');

// Ignore obsolete event
await dlqService.ignoreEvent(eventId, 'operator', 'Test data cleanup');

// Get DLQ statistics
const stats = await dlqService.getStatistics();
// { pending: 5, retried: 2, resolved: 10, ignored: 3, total: 20 }
```

**DLQ Status Flow:**

```
PENDING → RETRIED → (success or back to DLQ)
        → RESOLVED (fixed externally)
        → IGNORED (obsolete/invalid)
```

**Automatic Cleanup:** Resolved/Ignored events deleted after 30 days (daily cron at 4 AM).

### Saga Pattern (Distributed Transactions)

For multi-step operations requiring rollback:

```typescript
const result = await sagaOrchestrator.execute({
  sagaId: `registration-${accountId}`,
  steps: [
    {
      name: 'createAccount',
      execute: async (ctx) => {
        ctx.accountId = await accountService.create(ctx.input);
      },
      compensate: async (ctx) => {
        await accountService.delete(ctx.accountId);
      },
    },
    {
      name: 'createProfile',
      execute: async (ctx) => {
        await profileService.create({ accountId: ctx.accountId, ... });
      },
      compensate: async (ctx) => {
        await profileService.delete(ctx.accountId);
      },
    },
  ],
});
```

**Saga State Store (Redis):**

- Running sagas: 24-hour TTL
- Completed sagas: 1-hour TTL
- Status index for recovery queries
- Stale saga detection for crash recovery

## Configuration

### Environment Variables

```env
# Server
PORT=3005
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@host:5432/identity_db

# JWT
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=14d

# Security
BCRYPT_ROUNDS=12
ENCRYPTION_KEY=<32-bytes-base64>
ACCOUNT_LOCK_THRESHOLD=5
ACCOUNT_LOCK_DURATION_MINUTES=15

# API Keys (service-to-service)
API_KEYS=key1,key2,key3

# Valkey/Redis (caching)
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=
VALKEY_DB=0

# Kafka/Redpanda (optional)
REDPANDA_BROKERS=localhost:9092
REDPANDA_ENABLED=false
```

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

## Development

### Generate Prisma Client

```bash
pnpm --filter identity-service prisma:generate
```

### Run Migrations

```bash
# Using goose
goose -dir migrations/identity postgres "$DATABASE_URL" up
```

### Run Service

```bash
pnpm --filter identity-service dev
```

### Build

```bash
pnpm --filter identity-service build
```

## Entity Classes

Domain entities with business logic and sensitive field masking:

### SessionEntity

```typescript
import { SessionEntity } from './identity/sessions/entities/session.entity';

const session = SessionEntity.fromPrisma(prismaSession);

// Check if session is active
session.isActive(); // boolean

// Check if session expired
session.isExpired(); // boolean

// Safe JSON (masks token hashes)
session.toSafeJSON();
// { id: '...', tokenHash: '****', refreshTokenHash: '****', ... }
```

### ProfileEntity

```typescript
import { ProfileEntity } from './identity/profiles/entities/profile.entity';

const profile = ProfileEntity.fromPrisma(prismaProfile);

// Calculate age from birthDate
profile.calculateAge(); // 25

// Get full name
profile.getFullName(); // 'John Doe'
```

### DeviceEntity

```typescript
import { DeviceEntity } from './identity/devices/entities/device.entity';

const device = DeviceEntity.fromPrisma(prismaDevice);

// Get trust level based on factors
device.getTrustLevel(); // 'high' | 'medium' | 'low'

// Check if device is active and trusted
device.isActiveAndTrusted(); // boolean
```

## 2025 Best Practices

| Standard             | Status | Implementation                   |
| -------------------- | ------ | -------------------------------- |
| RFC 9068 (JWT)       | ✅     | `jti` claim, token revocation    |
| RFC 9562 (UUIDv7)    | ✅     | All IDs via `ID.generate()`      |
| RFC 4291 (IPv6)      | ✅     | /64 subnet comparison            |
| OWASP Argon2id       | ✅     | Password hashing (47 MiB memory) |
| Transactional Outbox | ✅     | DLQ + exponential backoff        |
| Token Hashing        | ✅     | refreshTokenHash (SHA-256)       |
| Token Revocation     | ✅     | JTI blacklist with cache-aside   |
| PII Masking          | ✅     | IPv4/IPv6 masking                |
| Error Sanitization   | ✅     | No IDs in error messages         |
| Permission Guard     | ✅     | Wildcard support                 |
| Saga Pattern         | ✅     | Redis state store                |

## Related Documentation

- [Architecture Overview](../../.ai/architecture.md)
- [Identity Service API Reference](../../.ai/services/identity-service.md) (LLM-optimized)
- [Auth Service](./AUTH_SERVICE.md)
- [Legal Service](./LEGAL_SERVICE.md)
- [Database Guide](../DATABASE.md)
- [Caching Strategy](../policies/CACHING.md)
