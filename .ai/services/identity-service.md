# Identity Service

> Core identity: accounts, sessions, devices, profiles | **Last Updated**: 2026-01-06

## Service Info

| Property | Value                        |
| -------- | ---------------------------- |
| REST     | :3000                        |
| gRPC     | :50051                       |
| Database | identity_db (PostgreSQL)     |
| Cache    | Valkey DB 0                  |
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

```
POST/GET/PATCH/DELETE  /accounts, /accounts/:id
GET    /accounts/by-email/:email, /accounts/by-username/:username
POST   /accounts/:id/verify-email, /accounts/:id/change-password
POST   /accounts/:id/mfa/enable|verify|disable

POST   /sessions                    # Create (rate: 10/min)
GET    /sessions, /sessions/:id
POST   /sessions/refresh            # (rate: 30/min)
POST   /sessions/validate           # (rate: 100/min)
DELETE /sessions/:id, /sessions/account/:accountId

POST/GET/PATCH/DELETE  /devices, /devices/:id
POST   /devices/:id/trust
GET/PATCH  /profiles/:accountId
```

## gRPC Server (:50051)

| Method            | Description            |
| ----------------- | ---------------------- |
| GetAccount        | Get account by ID      |
| GetAccountByEmail | Get account by email   |
| ValidateAccount   | Check account status   |
| CreateSession     | Create login session   |
| ValidateSession   | Validate session token |
| RevokeSession     | Revoke session         |
| GetAccountDevices | List account devices   |
| TrustDevice       | Mark device trusted    |

**Proto**: `packages/proto/identity/v1/identity.proto`

## Database Tables

| Table         | Purpose            |
| ------------- | ------------------ |
| accounts      | Core account data  |
| sessions      | Active sessions    |
| devices       | Registered devices |
| profiles      | User profiles      |
| outbox_events | Event outbox       |

## Events

```typescript
'ACCOUNT_CREATED' | 'ACCOUNT_UPDATED' | 'ACCOUNT_DELETED';
'SESSION_STARTED' | 'SESSION_REFRESHED' | 'SESSION_ENDED';
'DEVICE_REGISTERED' | 'DEVICE_TRUSTED' | 'DEVICE_REMOVED';
'MFA_ENABLED' | 'MFA_DISABLED';
```

## Caching

| Key Pattern             | TTL     |
| ----------------------- | ------- |
| `account:id:{id}`       | 5 min   |
| `account:email:{email}` | 5 min   |
| `session:token:{hash}`  | 1 hour  |
| `revoked:jti:{jti}`     | 14 days |

## Environment

```bash
PORT=3000
GRPC_PORT=50051
DATABASE_URL=postgresql://...identity_db
VALKEY_HOST=localhost
JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...
```

---

**Full docs**: `docs/services/IDENTITY_SERVICE.md`
