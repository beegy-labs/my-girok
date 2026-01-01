# Identity Service

> Core identity management: accounts, sessions, devices, profiles (Port 3000)

## Overview

The Identity Service manages core user identity data for the my-girok Identity Platform. It is one of three separated services in Phase 3 architecture.

---

## Domain Boundaries (CRITICAL)

> **WARNING**: This service has a strict domain boundary. It handles ONLY identity-related data.

### What Belongs HERE (identity-service)

```
+------------------------------------------------------------------+
|                    IDENTITY-SERVICE SCOPE                         |
|                        (Port 3000)                                |
+------------------------------------------------------------------+
|                                                                   |
|  [OK] accounts        - User core identity, status, MFA          |
|  [OK] sessions        - Login sessions, token management         |
|  [OK] devices         - Device registration, trust               |
|  [OK] profiles        - User profile data (name, avatar, etc)    |
|  [OK] credentials     - Password, OAuth, passkeys                |
|  [OK] app-registry    - Multi-app configuration                  |
|  [OK] outbox_events   - Transactional outbox for this service    |
|                                                                   |
+------------------------------------------------------------------+
```

### What Does NOT Belong Here

```
+------------------------------------------------------------------+
|                    DO NOT ADD TO THIS SERVICE                     |
+------------------------------------------------------------------+
|                                                                   |
|  [X] roles/permissions    --> belongs to auth-service             |
|  [X] operators/admins     --> belongs to auth-service             |
|  [X] sanctions            --> belongs to auth-service             |
|  [X] api-keys             --> belongs to auth-service             |
|  [X] consents             --> belongs to legal-service            |
|  [X] legal documents      --> belongs to legal-service            |
|  [X] law-registry         --> belongs to legal-service            |
|  [X] dsr-requests         --> belongs to legal-service            |
|                                                                   |
+------------------------------------------------------------------+
```

### Service Boundary Summary

| Service          | Database    | Port | Scope                                    |
| ---------------- | ----------- | ---- | ---------------------------------------- |
| identity-service | identity_db | 3000 | accounts, sessions, devices, profiles    |
| auth-service     | auth_db     | 3001 | roles, permissions, operators, sanctions |
| legal-service    | legal_db    | 3005 | consents, documents, law-registry, dsr   |

---

## Architecture

### Identity Platform (Phase 3 - 3 Separate Services)

```
+==================================================================================+
|                          IDENTITY PLATFORM (Phase 3)                              |
|                                                                                   |
|   +------------------------+  +------------------------+  +---------------------+ |
|   |   IDENTITY-SERVICE     |  |     AUTH-SERVICE       |  |    LEGAL-SERVICE    | |
|   |      (Port 3000)       |  |      (Port 3001)       |  |     (Port 3005)     | |
|   +------------------------+  +------------------------+  +---------------------+ |
|   |                        |  |                        |  |                     | |
|   |  * accounts            |  |  * roles               |  |  * consents         | |
|   |  * sessions            |  |  * permissions         |  |  * legal-documents  | |
|   |  * devices             |  |  * operators           |  |  * law-registry     | |
|   |  * profiles            |  |  * sanctions           |  |  * dsr-requests     | |
|   |  * credentials         |  |  * api-keys            |  |                     | |
|   |  * app-registry        |  |  * admins              |  |                     | |
|   +------------------------+  +------------------------+  +---------------------+ |
|              |                         |                          |               |
|              v                         v                          v               |
|        identity_db                 auth_db                   legal_db             |
|       (PostgreSQL)               (PostgreSQL)              (PostgreSQL)           |
+==================================================================================+

Communication: gRPC between services (no direct DB access across services)
```

### This Service's Scope

| Domain      | Tables          | Purpose                          |
| ----------- | --------------- | -------------------------------- |
| Accounts    | `accounts`      | User identity, status, MFA       |
| Sessions    | `sessions`      | Login sessions, token management |
| Devices     | `devices`       | Device registration, trust       |
| Profiles    | `profiles`      | User profile data                |
| Credentials | `credentials`   | Password, OAuth, passkeys        |
| Apps        | `app_registry`  | Multi-app configuration          |
| Events      | `outbox_events` | Transactional outbox             |

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

## Inter-Service Communication

### Accessing Data from Other Services

When identity-service needs data from other domains, use gRPC calls - NEVER direct database access.

```
+------------------------------------------------------------------+
|                    CORRECT: Use gRPC                              |
+------------------------------------------------------------------+
|                                                                   |
|  // Check if user is sanctioned before creating session          |
|  const sanctions = await authServiceClient.getSanctions({        |
|    accountId: account.id                                         |
|  });                                                              |
|                                                                   |
|  // Get user consents for registration flow                      |
|  const consents = await legalServiceClient.getConsents({         |
|    accountId: account.id,                                        |
|    appId: app.id                                                 |
|  });                                                              |
|                                                                   |
+------------------------------------------------------------------+
```

```
+------------------------------------------------------------------+
|                    WRONG: Direct DB Access                        |
+------------------------------------------------------------------+
|                                                                   |
|  // DO NOT DO THIS - accessing auth_db from identity-service     |
|  const sanctions = await authPrisma.sanctions.findMany({         |
|    where: { accountId }                                          |
|  });                                                              |
|                                                                   |
+------------------------------------------------------------------+
```

### Cross-Service References

When storing references to entities in other services, use UUIDs without foreign key constraints:

```sql
-- In identity_db: NO cross-DB foreign keys
-- This account_id references auth_db.sanctions, but NO FK constraint
CREATE TABLE example_table (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,  -- References identity_db.accounts (same DB, FK OK)
    -- No FK constraint to other databases
);
```

### Event Publishing

Each service publishes events only to its own `outbox_events` table:

```typescript
// In identity-service: only write to identity_db.outbox_events
await this.prisma.outboxEvents.create({
  data: {
    aggregateType: 'ACCOUNT',
    aggregateId: account.id,
    eventType: 'ACCOUNT_CREATED',
    payload: { accountId: account.id, email: account.email },
  },
});
```

---

## gRPC Server

The identity-service exposes a gRPC server on port **50051** for inter-service communication.

### Starting the gRPC Server

The gRPC server starts alongside the REST API:

```bash
# In main.ts
const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  createIdentityGrpcOptions({ port: 50051 }),
);
await grpcApp.listen();
```

### Proto Definition

```protobuf
// packages/proto/identity/v1/identity.proto
syntax = "proto3";
package identity.v1;

service IdentityService {
  rpc GetAccount(GetAccountRequest) returns (GetAccountResponse);
  rpc GetAccountByEmail(GetAccountByEmailRequest) returns (GetAccountByEmailResponse);
  rpc GetAccountByUsername(GetAccountByUsernameRequest) returns (GetAccountByUsernameResponse);
  rpc ValidateAccount(ValidateAccountRequest) returns (ValidateAccountResponse);
  rpc CreateAccount(CreateAccountRequest) returns (CreateAccountResponse);
  rpc UpdateAccount(UpdateAccountRequest) returns (UpdateAccountResponse);
  rpc DeleteAccount(DeleteAccountRequest) returns (DeleteAccountResponse);
  rpc ValidatePassword(ValidatePasswordRequest) returns (ValidatePasswordResponse);
  rpc CreateSession(CreateSessionRequest) returns (CreateSessionResponse);
  rpc ValidateSession(ValidateSessionRequest) returns (ValidateSessionResponse);
  rpc RevokeSession(RevokeSessionRequest) returns (RevokeSessionResponse);
  rpc RevokeAllSessions(RevokeAllSessionsRequest) returns (RevokeAllSessionsResponse);
  rpc GetAccountDevices(GetAccountDevicesRequest) returns (GetAccountDevicesResponse);
  rpc TrustDevice(TrustDeviceRequest) returns (TrustDeviceResponse);
  rpc RevokeDevice(RevokeDeviceRequest) returns (RevokeDeviceResponse);
  rpc GetProfile(GetProfileRequest) returns (GetProfileResponse);
}
```

### gRPC Environment Variables

| Variable             | Default | Description       |
| -------------------- | ------- | ----------------- |
| `IDENTITY_GRPC_PORT` | 50051   | gRPC server port  |
| `IDENTITY_GRPC_HOST` | 0.0.0.0 | gRPC bind address |

### Client Usage (from other services)

Other services can call identity-service via the `IdentityGrpcClient`:

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

---

## Related Documentation

- [Architecture Overview](../../.ai/architecture.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md) (includes Domain Boundaries)
- [Identity Service LLM Reference](../../.ai/services/identity-service.md)
- [Auth Service](../../.ai/services/auth-service.md)
- [Legal Service](../../.ai/services/legal-service.md)
- [gRPC Clients Guide](../packages/nest-common.md#grpc-clients)
