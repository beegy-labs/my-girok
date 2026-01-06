# Identity Service

> Core identity management: accounts, sessions, devices, profiles

## Overview

The Identity Service manages core user identity data for the my-girok Identity Platform. It handles user accounts, sessions, devices, and profiles.

| Property  | Value                       |
| --------- | --------------------------- |
| REST Port | 3000                        |
| gRPC Port | 50051                       |
| Framework | NestJS 11 + TypeScript 5.9  |
| Database  | identity_db (PostgreSQL 16) |

> **Note**: This service handles ONLY identity. Authorization is handled by `auth-service`, legal compliance by `legal-service`.

## Domain Boundaries

### What Belongs Here

- Accounts (user identity, status, MFA)
- Sessions (login sessions, token management)
- Devices (device registration, trust)
- Profiles (user profile data)
- Credentials (password, OAuth, passkeys)

### What Does NOT Belong Here

| Domain               | Correct Service |
| -------------------- | --------------- |
| Roles, Permissions   | auth-service    |
| Operators, Sanctions | auth-service    |
| Consents, Documents  | legal-service   |
| DSR Requests         | legal-service   |

## API Reference

> See `.ai/services/identity-service.md` for quick endpoint list.

### Accounts API

| Method | Endpoint                           | Description             |
| ------ | ---------------------------------- | ----------------------- |
| POST   | `/v1/accounts`                     | Create account          |
| GET    | `/v1/accounts`                     | List accounts           |
| GET    | `/v1/accounts/:id`                 | Get account by ID       |
| GET    | `/v1/accounts/by-email/:email`     | Get by email            |
| GET    | `/v1/accounts/by-username/:uname`  | Get by username         |
| PATCH  | `/v1/accounts/:id`                 | Update account          |
| DELETE | `/v1/accounts/:id`                 | Soft delete             |
| POST   | `/v1/accounts/:id/verify-email`    | Verify email            |
| POST   | `/v1/accounts/:id/change-password` | Change password (3/min) |
| PATCH  | `/v1/accounts/:id/status`          | Update status           |
| POST   | `/v1/accounts/:id/mfa/enable`      | Enable MFA              |
| POST   | `/v1/accounts/:id/mfa/verify`      | Verify MFA setup        |
| POST   | `/v1/accounts/:id/mfa/disable`     | Disable MFA             |

### Sessions API

| Method | Endpoint                                | Description     |
| ------ | --------------------------------------- | --------------- |
| POST   | `/v1/sessions`                          | Create session  |
| GET    | `/v1/sessions`                          | List sessions   |
| GET    | `/v1/sessions/:id`                      | Get session     |
| POST   | `/v1/sessions/refresh`                  | Refresh tokens  |
| POST   | `/v1/sessions/validate`                 | Validate token  |
| POST   | `/v1/sessions/:id/touch`                | Update activity |
| DELETE | `/v1/sessions/:id`                      | Revoke session  |
| DELETE | `/v1/sessions/account/:accountId`       | Revoke all      |
| GET    | `/v1/sessions/account/:accountId/count` | Session count   |
| POST   | `/v1/sessions/cleanup`                  | Admin cleanup   |

### Devices API

| Method | Endpoint                  | Description          |
| ------ | ------------------------- | -------------------- |
| POST   | `/v1/devices`             | Register device      |
| GET    | `/v1/devices/:id`         | Get device           |
| GET    | `/v1/devices/account/:id` | List account devices |
| PATCH  | `/v1/devices/:id`         | Update device        |
| DELETE | `/v1/devices/:id`         | Remove device        |
| POST   | `/v1/devices/:id/trust`   | Trust device         |

### Profiles API

| Method | Endpoint           | Description    |
| ------ | ------------------ | -------------- |
| GET    | `/v1/profiles/:id` | Get profile    |
| PATCH  | `/v1/profiles/:id` | Update profile |

## Database Schema

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
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
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
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
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
    browser_name VARCHAR(50),
    is_trusted BOOLEAN DEFAULT FALSE,
    trusted_at TIMESTAMPTZ(6),
    push_token TEXT,
    last_seen_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
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
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);
```

## Security

### Account Security

| Feature          | Implementation              |
| ---------------- | --------------------------- |
| Password Hashing | bcrypt (cost factor 12)     |
| Token Storage    | SHA-256 hash (never plain)  |
| MFA Methods      | TOTP (RFC 6238), SMS, EMAIL |
| Lockout Policy   | 5 failed → 30min lock       |
| Password History | Last 5 passwords blocked    |

### MFA Implementation

MFA secrets are encrypted at rest using AES-256-GCM:

```typescript
// Encryption format: iv:authTag:encryptedData (base64)
const encryptedSecret = cryptoService.encrypt(totpSecret);
```

Set `ENCRYPTION_KEY` environment variable (32 bytes, base64 encoded).

### Rate Limiting

| Endpoint                             | Limit | TTL |
| ------------------------------------ | ----- | --- |
| `POST /sessions`                     | 10    | 60s |
| `POST /sessions/refresh`             | 30    | 60s |
| `POST /sessions/validate`            | 100   | 60s |
| `POST /sessions/cleanup`             | 1     | 60s |
| `POST /accounts/:id/change-password` | 3     | 60s |

## gRPC Server

> See `.ai/services/identity-service.md` for method list.

```typescript
import { GrpcClientsModule, IdentityGrpcClient } from '@my-girok/nest-common';

@Module({
  imports: [GrpcClientsModule.forRoot({ identity: true })],
})
export class AppModule {}

@Injectable()
export class SomeService {
  constructor(private readonly identityClient: IdentityGrpcClient) {}

  async getUser(id: string) {
    const { account } = await this.identityClient.getAccount({ id });
    return account;
  }
}
```

## Inter-Service Communication

When identity-service needs data from other domains, use gRPC - NEVER direct database access:

```typescript
// CORRECT: Use gRPC
const sanctions = await authServiceClient.getSanctions({ accountId });
const consents = await legalServiceClient.getConsents({ accountId });

// WRONG: Direct DB access (DO NOT DO THIS)
// const sanctions = await authPrisma.sanctions.findMany({ where: { accountId } });
```

## Development

```bash
# Start service
pnpm --filter @my-girok/identity-service dev

# Run tests
pnpm --filter @my-girok/identity-service test

# Run migrations
goose -dir migrations/identity postgres "$DATABASE_URL" up
```

## Related Documentation

- [Auth Service](./AUTH_SERVICE.md)
- [Legal Service](./LEGAL_SERVICE.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md)
- [gRPC Guide](../guides/GRPC.md)
