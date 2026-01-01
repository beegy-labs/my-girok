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
| passwordHash        | VARCHAR(255) | bcrypt hashed                           |
| status              | ENUM         | ACTIVE, SUSPENDED, PENDING_VERIFICATION |
| mode                | ENUM         | STANDALONE, UNIFIED                     |
| mfaEnabled          | BOOLEAN      | MFA status                              |
| mfaSecret           | TEXT         | Encrypted TOTP secret (AES-256-GCM)     |
| failedLoginAttempts | INTEGER      | Counter for lockout                     |
| lockedUntil         | TIMESTAMP    | Lockout expiry                          |
| emailVerified       | BOOLEAN      | Email verification status               |
| createdAt           | TIMESTAMP    | Creation timestamp                      |
| updatedAt           | TIMESTAMP    | Last update timestamp                   |

### Sessions Table

Active user sessions with token hashing:

| Column           | Type      | Description                   |
| ---------------- | --------- | ----------------------------- |
| id               | UUID (v7) | Primary key                   |
| accountId        | UUID      | Foreign key to accounts       |
| tokenHash        | VARCHAR   | SHA-256 hash of access token  |
| refreshTokenHash | VARCHAR   | SHA-256 hash of refresh token |
| userAgent        | VARCHAR   | Client user agent             |
| ipAddress        | INET      | Client IP address             |
| expiresAt        | TIMESTAMP | Session expiry                |
| lastActivityAt   | TIMESTAMP | Last activity timestamp       |

### Devices Table

Registered devices with trust management:

| Column      | Type         | Description                      |
| ----------- | ------------ | -------------------------------- |
| id          | UUID (v7)    | Primary key                      |
| accountId   | UUID         | Foreign key to accounts          |
| fingerprint | VARCHAR(255) | Device fingerprint hash          |
| deviceType  | ENUM         | MOBILE, TABLET, DESKTOP, BROWSER |
| osVersion   | VARCHAR(50)  | Operating system version         |
| appVersion  | VARCHAR(20)  | Application version              |
| trusted     | BOOLEAN      | Trust status                     |
| lastUsedAt  | TIMESTAMP    | Last activity timestamp          |

### Profiles Table

User profile information:

| Column      | Type         | Description                      |
| ----------- | ------------ | -------------------------------- |
| id          | UUID (v7)    | Primary key                      |
| accountId   | UUID         | Foreign key to accounts          |
| displayName | VARCHAR(100) | Display name                     |
| gender      | ENUM         | MALE, FEMALE, OTHER, UNSPECIFIED |
| birthDate   | DATE         | Date of birth                    |
| address     | JSON         | Address information              |
| avatarUrl   | VARCHAR(500) | Profile picture URL              |

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

### MFA Implementation

MFA secrets are encrypted at rest using AES-256-GCM:

```typescript
// Encryption format: iv:authTag:encryptedData (base64)
const encryptedSecret = cryptoService.encrypt(totpSecret);
```

Set `ENCRYPTION_KEY` environment variable (32 bytes, base64 encoded).

### Token Security

- **Access tokens**: Short-lived (1 hour)
- **Refresh tokens**: SHA-256 hashed before storage
- **Session binding**: IP + User-Agent validation

### Account Lockout

- 5 failed attempts triggers lockout
- 15-minute lockout duration
- Configurable via environment variables

### PII Masking

All logs use masking utilities:

```typescript
import { maskUuid, maskEmail, maskIpAddress } from './common/utils/masking.util';

this.logger.log(`Account created: ${maskUuid(accountId)}`);
// Output: Account created: 550e8400-****-****-****-********0000
```

| Function          | Example Input                          | Example Output                         |
| ----------------- | -------------------------------------- | -------------------------------------- |
| `maskUuid()`      | `550e8400-e29b-41d4-a716-446655440000` | `550e8400-****-****-****-********0000` |
| `maskEmail()`     | `user@example.com`                     | `us***@example.com`                    |
| `maskIpAddress()` | `192.168.1.100`                        | `192.168.*.*`                          |

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

| Endpoint                             | Limit | TTL | Reason                |
| ------------------------------------ | ----- | --- | --------------------- |
| `POST /sessions`                     | 10    | 60s | Prevent session flood |
| `POST /sessions/refresh`             | 30    | 60s | Reasonable refresh    |
| `POST /sessions/validate`            | 100   | 60s | High-frequency        |
| `POST /accounts/:id/change-password` | 3     | 60s | Prevent brute force   |

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

## 2025 Best Practices

| Standard             | Status | Implementation              |
| -------------------- | ------ | --------------------------- |
| RFC 9068 (JWT)       | ✅     | `aud` claim, RS256          |
| RFC 9562 (UUIDv7)    | ✅     | All IDs via `ID.generate()` |
| Transactional Outbox | ✅     | Redpanda-ready              |
| Token Hashing        | ✅     | refreshTokenHash (SHA-256)  |
| PII Masking          | ✅     | `masking.util.ts`           |
| Error Sanitization   | ✅     | No IDs in error messages    |

## Related Documentation

- [Architecture Overview](../../.ai/architecture.md)
- [Identity Service API Reference](../../.ai/services/identity-service.md) (LLM-optimized)
- [Auth Service](./AUTH_SERVICE.md)
- [Legal Service](./LEGAL_SERVICE.md)
- [Database Guide](../DATABASE.md)
- [Caching Strategy](../policies/CACHING.md)
