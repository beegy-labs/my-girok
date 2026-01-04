# Identity Service

> Core identity: accounts, sessions, devices, profiles

## Service Info

| Property | Value                        |
| -------- | ---------------------------- |
| REST     | :3000                        |
| gRPC     | :50051                       |
| Database | identity_db (PostgreSQL)     |
| Events   | `identity.*` (Redpanda)      |
| Codebase | `services/identity-service/` |

## Domain Boundaries

| This Service       | NOT This Service            |
| ------------------ | --------------------------- |
| Accounts, Sessions | Roles, Permissions (auth)   |
| Devices, Profiles  | Operators, Sanctions (auth) |
| Account lifecycle  | Consents, Documents (legal) |
| MFA enablement     | DSR Requests (legal)        |

## REST API

### Accounts

```
POST/GET/PATCH/DELETE  /accounts, /accounts/:id
GET    /accounts/by-email/:email, /accounts/by-username/:username
POST   /accounts/:id/verify-email, /accounts/:id/change-password
PATCH  /accounts/:id/status
POST   /accounts/:id/mfa/enable|verify|disable
```

### Sessions

```
POST   /sessions                    # Create (rate: 10/min)
GET    /sessions, /sessions/:id
POST   /sessions/refresh            # (rate: 30/min)
POST   /sessions/validate           # (rate: 100/min)
POST   /sessions/:id/touch
DELETE /sessions/:id, /sessions/account/:accountId
```

### Devices & Profiles

```
POST/GET/PATCH/DELETE  /devices, /devices/:id
GET    /devices/account/:accountId
POST   /devices/:id/trust
GET/PATCH  /profiles/:accountId
```

## gRPC Server (:50051)

| Method            | Description            |
| ----------------- | ---------------------- |
| GetAccount        | Get account by ID      |
| GetAccountByEmail | Get account by email   |
| ValidateAccount   | Check account status   |
| CreateAccount     | Create new account     |
| UpdateAccount     | Update account         |
| DeleteAccount     | Soft delete            |
| ValidatePassword  | Verify password        |
| CreateSession     | Create login session   |
| ValidateSession   | Validate session token |
| RevokeSession     | Revoke single session  |
| RevokeAllSessions | Revoke all sessions    |
| GetAccountDevices | List account devices   |
| TrustDevice       | Mark device trusted    |
| RevokeDevice      | Remove device          |
| GetProfile        | Get user profile       |

**Proto**: `packages/proto/identity/v1/identity.proto`

```typescript
import { IdentityGrpcClient } from '@my-girok/nest-common';

const { valid, status } = await this.identityClient.validateAccount({
  id: accountId,
});
```

## Database Tables

| Table         | Purpose            |
| ------------- | ------------------ |
| accounts      | Core account data  |
| sessions      | Active sessions    |
| devices       | Registered devices |
| profiles      | User profiles      |
| outbox_events | Event outbox       |

## Security

| Feature          | Implementation          |
| ---------------- | ----------------------- |
| Password Hashing | bcrypt (cost 12)        |
| Token Storage    | SHA-256 hash            |
| MFA Methods      | TOTP, SMS, EMAIL        |
| Lockout Policy   | 5 attempts → 15min lock |

## Event Types

```typescript
'ACCOUNT_CREATED' | 'ACCOUNT_UPDATED' | 'ACCOUNT_DELETED';
'EMAIL_VERIFIED' | 'PASSWORD_CHANGED';
'SESSION_STARTED' | 'SESSION_REFRESHED' | 'SESSION_ENDED';
'DEVICE_REGISTERED' | 'DEVICE_TRUSTED' | 'DEVICE_REMOVED';
'MFA_ENABLED' | 'MFA_DISABLED';
```

## Caching

| Key Pattern                | TTL     |
| -------------------------- | ------- |
| `account:id:{id}`          | 5 min   |
| `account:email:{email}`    | 5 min   |
| `account:username:{uname}` | 5 min   |
| `session:token:{hash}`     | 1 hour  |
| `revoked:jti:{jti}`        | 14 days |

## Environment

```bash
PORT=3000
GRPC_PORT=50051
DATABASE_URL=postgresql://...identity_db
VALKEY_HOST=localhost
JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

---

**Full docs**: `docs/services/IDENTITY_SERVICE.md`
