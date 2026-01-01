# Identity Service

> Core identity management: accounts, sessions, devices, profiles (Port 3000)

## Overview

The Identity Service manages core user identity data for the my-girok Identity Platform. It is one of three separated services in the platform.

## Architecture

### Identity Platform (3 Services)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Identity Platform (Phase 3)                        │
│                                                                       │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐        │
│  │  Identity   │       │    Auth     │       │    Legal    │        │
│  │  Service    │◄─────►│   Service   │◄─────►│   Service   │        │
│  │ (Port 3000) │ gRPC  │ (Port 3001) │ gRPC  │ (Port 3005) │        │
│  └──────┬──────┘       └──────┬──────┘       └──────┬──────┘        │
│         │                     │                     │                │
│         ▼                     ▼                     ▼                │
│   identity_db             auth_db              legal_db              │
│   (PostgreSQL)           (PostgreSQL)         (PostgreSQL)           │
└──────────────────────────────────────────────────────────────────────┘
```

### This Service's Scope

| Domain   | Tables          | Purpose                          |
| -------- | --------------- | -------------------------------- |
| Accounts | `accounts`      | User identity, status, MFA       |
| Sessions | `sessions`      | Login sessions, token management |
| Devices  | `devices`       | Device registration, trust       |
| Profiles | `profiles`      | User profile data                |
| Events   | `outbox_events` | Transactional outbox             |

## Key Features

- **UUIDv7 Primary Keys**: Time-ordered UUIDs (RFC 9562) for better B-tree performance
- **Transactional Outbox Pattern**: Reliable event publishing with retry logic
- **gRPC Inter-Service**: Communicates with auth-service and legal-service
- **MFA Support**: TOTP (RFC 6238), SMS, EMAIL methods

## API Endpoints

### Accounts

| Method | Endpoint                          | Description               |
| ------ | --------------------------------- | ------------------------- |
| POST   | `/accounts`                       | Create account            |
| GET    | `/accounts`                       | List accounts (paginated) |
| GET    | `/accounts/:id`                   | Get account by ID         |
| GET    | `/accounts/by-email/:email`       | Get by email              |
| GET    | `/accounts/by-username/:username` | Get by username           |
| PATCH  | `/accounts/:id`                   | Update account            |
| DELETE | `/accounts/:id`                   | Soft delete account       |
| POST   | `/accounts/:id/verify-email`      | Verify email              |
| POST   | `/accounts/:id/change-password`   | Change password (3/min)   |
| PATCH  | `/accounts/:id/status`            | Update status             |
| POST   | `/accounts/:id/mfa/enable`        | Enable MFA                |
| POST   | `/accounts/:id/mfa/verify`        | Verify MFA setup          |
| POST   | `/accounts/:id/mfa/disable`       | Disable MFA               |

### Sessions

| Method | Endpoint                             | Description               |
| ------ | ------------------------------------ | ------------------------- |
| POST   | `/sessions`                          | Create session (10/min)   |
| GET    | `/sessions`                          | List sessions (paginated) |
| GET    | `/sessions/:id`                      | Get session by ID         |
| POST   | `/sessions/refresh`                  | Refresh tokens (30/min)   |
| POST   | `/sessions/validate`                 | Validate token (100/min)  |
| POST   | `/sessions/:id/touch`                | Update activity timestamp |
| DELETE | `/sessions/:id`                      | Revoke session            |
| DELETE | `/sessions/account/:accountId`       | Revoke all sessions       |
| GET    | `/sessions/account/:accountId/count` | Active session count      |
| POST   | `/sessions/cleanup`                  | Admin: cleanup (1/min)    |

### Devices

| Method | Endpoint                      | Description          |
| ------ | ----------------------------- | -------------------- |
| POST   | `/devices`                    | Register device      |
| GET    | `/devices/:id`                | Get device by ID     |
| GET    | `/devices/account/:accountId` | List account devices |
| PATCH  | `/devices/:id`                | Update device        |
| DELETE | `/devices/:id`                | Remove device        |
| POST   | `/devices/:id/trust`          | Trust device         |

### Profiles

| Method | Endpoint               | Description    |
| ------ | ---------------------- | -------------- |
| GET    | `/profiles/:accountId` | Get profile    |
| PATCH  | `/profiles/:accountId` | Update profile |

## Database Schema

### identity_db Tables

```sql
-- Accounts (core identity)
CREATE TABLE accounts (
    id UUID PRIMARY KEY,  -- UUIDv7
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) UNIQUE,
    password_hash TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    account_mode VARCHAR(20) DEFAULT 'SERVICE',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,  -- Encrypted
    mfa_method VARCHAR(20),
    mfa_backup_codes TEXT[],
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ(6),
    last_password_change TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id),
    device_id UUID REFERENCES devices(id),
    token_hash VARCHAR(64) NOT NULL,
    refresh_token_hash VARCHAR(64),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    last_activity_at TIMESTAMPTZ(6),
    revoked_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Devices
CREATE TABLE devices (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id),
    fingerprint VARCHAR(64) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20),
    platform VARCHAR(50),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    browser_name VARCHAR(50),
    browser_version VARCHAR(20),
    is_trusted BOOLEAN DEFAULT FALSE,
    trusted_at TIMESTAMPTZ(6),
    push_token TEXT,
    push_platform VARCHAR(20),
    last_seen_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    phone VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20),
    address JSONB,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Outbox Events
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ(6)
);
```

## Security

### MFA Implementation

MFA secrets are encrypted at rest using AES-256-GCM:

```typescript
// Encryption format: iv:authTag:encryptedData (base64)
const encryptedSecret = cryptoService.encrypt(totpSecret);
```

Set `ENCRYPTION_KEY` environment variable (32 bytes, base64 encoded).

### Account Security

| Feature          | Implementation                 |
| ---------------- | ------------------------------ |
| Password Hashing | bcrypt (cost factor 12)        |
| Token Storage    | SHA-256 hash (never plaintext) |
| Lockout Policy   | 5 failed attempts → 30min lock |
| Password History | Last 5 passwords blocked       |

### Guards

| Guard          | Purpose             | Header          |
| -------------- | ------------------- | --------------- |
| `JwtAuthGuard` | User authentication | `Authorization` |
| `ApiKeyGuard`  | Service-to-service  | `X-API-Key`     |

## Event Types

```typescript
// Account Events
'ACCOUNT_CREATED';
'ACCOUNT_UPDATED';
'ACCOUNT_DELETED';
'ACCOUNT_STATUS_CHANGED';
'EMAIL_VERIFIED';
'PASSWORD_CHANGED';

// Session Events
'SESSION_STARTED';
'SESSION_REFRESHED';
'SESSION_ENDED';
'ALL_SESSIONS_REVOKED';

// Device Events
'DEVICE_REGISTERED';
'DEVICE_TRUSTED';
'DEVICE_REMOVED';

// MFA Events
'MFA_ENABLED';
'MFA_DISABLED';
'MFA_VERIFIED';
```

## Configuration

### Environment Variables

```env
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@host:5432/identity_db

# Cache (Valkey/Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=...
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=14d

# API Keys (service-to-service)
API_KEYS=key1,key2

# Encryption (MFA secrets)
ENCRYPTION_KEY=<32-bytes-base64>
```

### Rate Limiting

| Endpoint                             | Limit | TTL | Reason                    |
| ------------------------------------ | ----- | --- | ------------------------- |
| `POST /sessions`                     | 10    | 60s | Prevent session flood     |
| `POST /sessions/refresh`             | 30    | 60s | Allow reasonable refresh  |
| `POST /sessions/validate`            | 100   | 60s | High-frequency validation |
| `POST /sessions/cleanup`             | 1     | 60s | Admin operation           |
| `POST /accounts/:id/change-password` | 3     | 60s | Prevent brute force       |

## Caching Strategy

| Cache Key Pattern          | TTL     | Purpose               |
| -------------------------- | ------- | --------------------- |
| `account:id:{id}`          | 5 min   | Account by ID         |
| `account:email:{email}`    | 5 min   | Account by email      |
| `account:username:{uname}` | 5 min   | Account by username   |
| `session:token:{hash}`     | 1 hour  | Session by token hash |
| `revoked:jti:{jti}`        | 14 days | Revoked token JTIs    |

## Development

### Run Migrations

```bash
# Using goose
goose -dir migrations/identity postgres "$DATABASE_URL" up
```

### Generate Prisma Client

```bash
pnpm prisma:generate:identity
```

### Run Service

```bash
pnpm dev
```

## Related Documentation

- [Architecture Overview](../../.ai/architecture.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md)
- [Identity Service LLM Reference](../../.ai/services/identity-service.md)
- [Auth Service](../../.ai/services/auth-service.md)
- [Legal Service](../../.ai/services/legal-service.md)
