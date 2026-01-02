# Identity Service

> **WARNING: This is an INDEPENDENT service. Do NOT add auth/legal code here.**

Core identity management: accounts, sessions, devices, profiles

## Domain Boundaries

| This Service (identity) | NOT This Service                    |
| ----------------------- | ----------------------------------- |
| Accounts, Sessions      | Roles, Permissions (auth-service)   |
| Devices, Profiles       | Operators, Sanctions (auth-service) |
| Account lifecycle       | Consents, Documents (legal-service) |
| MFA enablement          | DSR Requests (legal-service)        |

---

## Service Info

| Property  | Value                          |
| --------- | ------------------------------ |
| REST Port | 3000                           |
| gRPC Port | 50051                          |
| Database  | identity_db (PostgreSQL)       |
| Codebase  | `services/identity-service/`   |
| Events    | `identity.*` topics (Redpanda) |

---

## Architecture

```
identity-service (Port 3000)
├── accounts/       # User accounts (UUIDv7)
├── sessions/       # Login sessions
├── devices/        # Device management
└── profiles/       # User profiles
        │
        ▼
   identity_db (PostgreSQL)
```

**Inter-Service Communication**:

- `auth-service`: Permission checks, sanctions (gRPC)
- `legal-service`: Consent validation (gRPC)

---

## gRPC Server (Port 50051)

This service exposes a gRPC server for other services to call.

### Available Methods

| Method            | Request                | Response            | Description            |
| ----------------- | ---------------------- | ------------------- | ---------------------- |
| GetAccount        | `{id}`                 | `{account}`         | Get account by ID      |
| GetAccountByEmail | `{email}`              | `{account}`         | Get account by email   |
| ValidateAccount   | `{id}`                 | `{valid, status}`   | Check account exists   |
| CreateAccount     | `{email, password...}` | `{account}`         | Create new account     |
| UpdateAccount     | `{id, fields...}`      | `{account}`         | Update account         |
| DeleteAccount     | `{id}`                 | `{success}`         | Soft delete account    |
| ValidatePassword  | `{account_id, pwd}`    | `{valid}`           | Verify password        |
| CreateSession     | `{account_id, ip...}`  | `{session, tokens}` | Create login session   |
| ValidateSession   | `{token_hash}`         | `{valid, session}`  | Validate session token |
| RevokeSession     | `{id}`                 | `{success}`         | Revoke single session  |
| RevokeAllSessions | `{account_id}`         | `{revoked_count}`   | Revoke all sessions    |
| GetAccountDevices | `{account_id}`         | `{devices[]}`       | List account devices   |
| TrustDevice       | `{device_id}`          | `{device}`          | Mark device as trusted |
| RevokeDevice      | `{device_id}`          | `{success}`         | Remove device          |
| GetProfile        | `{account_id}`         | `{profile}`         | Get user profile       |

### Proto Definition

```
packages/proto/identity/v1/identity.proto
```

### Client Usage (from other services)

```typescript
import { IdentityGrpcClient } from '@my-girok/nest-common';

@Injectable()
export class AuthService {
  constructor(private readonly identityClient: IdentityGrpcClient) {}

  async validateUser(accountId: string) {
    const { valid, status } = await this.identityClient.validateAccount({ id: accountId });
    return valid && status === 'ACTIVE';
  }
}
```

---

## Database Schema (identity_db)

| Table           | Purpose             | Key Fields                                                    |
| --------------- | ------------------- | ------------------------------------------------------------- |
| `accounts`      | Core account + auth | id, email, username, status, mode, mfaEnabled, lockedUntil    |
| `sessions`      | Active sessions     | id, accountId, tokenHash, refreshTokenHash, expiresAt         |
| `devices`       | Registered devices  | id, accountId, fingerprint, deviceType, osVersion, appVersion |
| `profiles`      | User profiles       | id, accountId, displayName, gender, birthDate, address        |
| `outbox_events` | Event outbox        | id, eventType, payload, status, retryCount                    |

---

## API Endpoints

### Accounts

```
POST   /accounts                  # Create account
GET    /accounts                  # List accounts (paginated)
GET    /accounts/:id              # Get account by ID
GET    /accounts/external/:externalId  # Get by external ID
GET    /accounts/by-email/:email  # Get account by email
GET    /accounts/by-username/:username  # Get account by username
PATCH  /accounts/:id              # Update account
DELETE /accounts/:id              # Soft delete account
POST   /accounts/:id/verify-email # Verify email
POST   /accounts/:id/change-password  # Change password (rate: 3/min)
PATCH  /accounts/:id/status       # Update account status
POST   /accounts/:id/mfa/enable   # Enable MFA (TOTP/SMS/EMAIL)
POST   /accounts/:id/mfa/verify   # Verify and complete MFA setup
POST   /accounts/:id/mfa/disable  # Disable MFA
```

### Sessions

```
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
```

### Devices

```
POST   /devices                   # Register device
GET    /devices/:id               # Get device by ID
GET    /devices/account/:accountId # List account devices
PATCH  /devices/:id               # Update device
DELETE /devices/:id               # Remove device
POST   /devices/:id/trust         # Trust device
```

### Profiles

```
GET    /profiles/:accountId       # Get profile
PATCH  /profiles/:accountId       # Update profile
```

---

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

---

## Code Structure

```
services/identity-service/
├── prisma/
│   └── schema.prisma           # identity_db schema
├── migrations/
│   └── identity/               # goose migrations
└── src/
    ├── database/
    │   └── prisma.service.ts   # Prisma client + UUIDv7
    ├── common/
    │   ├── cache/              # CacheService + TTL constants
    │   ├── guards/             # JWT, API key guards
    │   ├── interceptors/       # Idempotency, request context
    │   ├── filters/            # Exception filters
    │   ├── decorators/         # @Public, @CurrentUser
    │   └── utils/              # Masking utilities
    ├── accounts/
    │   ├── accounts.module.ts
    │   ├── accounts.controller.ts
    │   ├── accounts.service.ts
    │   └── dto/
    ├── sessions/
    │   ├── sessions.module.ts
    │   ├── sessions.controller.ts
    │   ├── sessions.service.ts
    │   └── dto/
    ├── devices/
    │   ├── devices.module.ts
    │   ├── devices.controller.ts
    │   ├── devices.service.ts
    │   └── dto/
    └── profiles/
        ├── profiles.module.ts
        ├── profiles.controller.ts
        ├── profiles.service.ts
        └── dto/
```

---

## Helm Deployment

### Chart Location

```
services/identity-service/helm/
├── Chart.yaml
├── values.yaml.example
├── README.md
└── templates/
    ├── _helpers.tpl
    ├── deployment.yaml
    ├── service.yaml          # HTTP + gRPC
    ├── ingress.yaml          # HTTP + optional gRPC
    ├── hpa.yaml
    ├── migration-job.yaml    # 3 DB migrations
    ├── sealed-secret.yaml
    └── serviceaccount.yaml
```

### CQRS Configuration (Read/Write Separation)

Enable read replicas for read-heavy operations:

```yaml
app:
  cqrs:
    enabled: true
    readReplica:
      poolSize: 10 # Connection pool for read replica
      idleTimeout: 30000 # 30 seconds
```

**Database URLs**:

| Purpose | Env Variable                 | Helm Secret Key              |
| ------- | ---------------------------- | ---------------------------- |
| Write   | `IDENTITY_DATABASE_URL`      | `identity-database-url`      |
| Write   | `AUTH_DATABASE_URL`          | `auth-database-url`          |
| Write   | `LEGAL_DATABASE_URL`         | `legal-database-url`         |
| Read    | `IDENTITY_READ_DATABASE_URL` | `identity-read-database-url` |
| Read    | `AUTH_READ_DATABASE_URL`     | `auth-read-database-url`     |
| Read    | `LEGAL_READ_DATABASE_URL`    | `legal-read-database-url`    |

### Module Mode

Configure module communication:

```yaml
app:
  moduleMode:
    identity: local # local | remote
    auth: local # local | remote
    legal: local # local | remote
```

### Migration Order (ArgoCD)

| Phase | Database    | Sync Wave | Job Name         |
| ----- | ----------- | --------- | ---------------- |
| 1     | identity_db | -5        | migrate-identity |
| 2     | auth_db     | -4        | migrate-auth     |
| 3     | legal_db    | -3        | migrate-legal    |

---

## Environment Variables

```env
PORT=3005
GRPC_PORT=50051
NODE_ENV=development

# Database URLs (3 Separate DBs)
IDENTITY_DATABASE_URL=postgresql://...identity_db
AUTH_DATABASE_URL=postgresql://...auth_db
LEGAL_DATABASE_URL=postgresql://...legal_db

# CQRS - Read Replicas (optional)
CQRS_ENABLED=false
# IDENTITY_READ_DATABASE_URL=postgresql://...
# AUTH_READ_DATABASE_URL=postgresql://...
# LEGAL_READ_DATABASE_URL=postgresql://...

# Module Mode
IDENTITY_MODE=local
AUTH_MODE=local
LEGAL_MODE=local

# Cache (Valkey/Redis)
VALKEY_HOST=localhost
VALKEY_PORT=6379

# JWT (RS256)
JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Outbox
OUTBOX_POLLING_INTERVAL_MS=5000
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

---

## Security

### Account Security

| Feature            | Implementation                   |
| ------------------ | -------------------------------- |
| Password Hashing   | bcrypt (cost factor 12)          |
| Token Storage      | SHA-256 hash (never plaintext)   |
| MFA Methods        | TOTP (RFC 6238), SMS, EMAIL      |
| Lockout Policy     | 5 failed attempts → 15min lock   |
| Session Revocation | Immediate invalidation via cache |

### Guards

| Guard          | Purpose             | Header          |
| -------------- | ------------------- | --------------- |
| `JwtAuthGuard` | User authentication | `Authorization` |
| `ApiKeyGuard`  | Service-to-service  | `X-API-Key`     |

---

## Caching Strategy

| Cache Key Pattern          | TTL     | Purpose               |
| -------------------------- | ------- | --------------------- |
| `account:id:{id}`          | 5 min   | Account by ID         |
| `account:email:{email}`    | 5 min   | Account by email      |
| `account:username:{uname}` | 5 min   | Account by username   |
| `session:token:{hash}`     | 1 hour  | Session by token hash |
| `revoked:jti:{jti}`        | 14 days | Revoked token JTIs    |

---

## 2025 Best Practices

| Standard             | Status | Implementation                   |
| -------------------- | ------ | -------------------------------- |
| RFC 9562 (UUIDv7)    | ✅     | All IDs via `ID.generate()`      |
| RFC 9068 (JWT)       | ✅     | `aud` claim, token hash storage  |
| Transactional Outbox | ✅     | Atomic with business operations  |
| PII Masking          | ✅     | `masking.util.ts` for all logs   |
| Idempotency          | ✅     | `Idempotency-Key` header support |
| Token Hashing        | ✅     | refreshTokenHash (SHA-256)       |

---

## Type Definitions

> SSOT: `packages/types/src/identity/`

| File            | Contents                               |
| --------------- | -------------------------------------- |
| `types.ts`      | Account, Session, Device, Profile DTOs |
| `interfaces.ts` | IAccountService, ISessionService, etc. |

---

## Related Services

- **auth-service**: RBAC, operators, sanctions → `.ai/services/auth-service.md`
- **legal-service**: Consents, DSR, law registry → `.ai/services/legal-service.md`

---

**Full policy**: `docs/policies/IDENTITY_PLATFORM.md`
