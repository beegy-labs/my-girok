# Identity Service

> Core identity management: accounts, sessions, devices, profiles

## Service Info

| Property | Value                        |
| -------- | ---------------------------- |
| REST     | :3005                        |
| gRPC     | :50051                       |
| Database | identity_db (PostgreSQL)     |
| Cache    | Valkey DB 0                  |
| Events   | `identity.*` (Redpanda)      |
| Codebase | `services/identity-service/` |

## Domain Boundaries

| This Service Owns | NOT This Service (Other Services)  |
| ----------------- | ---------------------------------- |
| Accounts          | Roles/Permissions (auth-service)   |
| Sessions          | Operators/Sanctions (auth-service) |
| Devices           | Consents/Documents (legal-service) |
| Profiles          | DSR Requests (legal-service)       |

## REST API

### Accounts

| Method | Endpoint                          | Description        |
| ------ | --------------------------------- | ------------------ |
| POST   | `/accounts`                       | Create new account |
| GET    | `/accounts`                       | List accounts      |
| GET    | `/accounts/:id`                   | Get account by ID  |
| PATCH  | `/accounts/:id`                   | Update account     |
| DELETE | `/accounts/:id`                   | Delete account     |
| GET    | `/accounts/by-email/:email`       | Find by email      |
| GET    | `/accounts/by-username/:username` | Find by username   |
| POST   | `/accounts/:id/verify-email`      | Verify email       |
| POST   | `/accounts/:id/change-password`   | Change password    |
| POST   | `/accounts/:id/mfa/enable`        | Enable MFA         |
| POST   | `/accounts/:id/mfa/verify`        | Verify MFA         |
| POST   | `/accounts/:id/mfa/disable`       | Disable MFA        |

### Sessions

| Method | Endpoint                       | Description             |
| ------ | ------------------------------ | ----------------------- |
| POST   | `/sessions`                    | Create session (login)  |
| GET    | `/sessions`                    | List sessions           |
| GET    | `/sessions/:id`                | Get session by ID       |
| POST   | `/sessions/refresh`            | Refresh token           |
| POST   | `/sessions/validate`           | Validate token          |
| DELETE | `/sessions/:id`                | Delete session (logout) |
| DELETE | `/sessions/account/:accountId` | Revoke all sessions     |

### Devices

| Method | Endpoint             | Description            |
| ------ | -------------------- | ---------------------- |
| POST   | `/devices`           | Register device        |
| GET    | `/devices`           | List devices           |
| GET    | `/devices/:id`       | Get device by ID       |
| PATCH  | `/devices/:id`       | Update device          |
| DELETE | `/devices/:id`       | Remove device          |
| POST   | `/devices/:id/trust` | Mark device as trusted |

### Profiles

| Method | Endpoint               | Description    |
| ------ | ---------------------- | -------------- |
| GET    | `/profiles/:accountId` | Get profile    |
| PATCH  | `/profiles/:accountId` | Update profile |

## gRPC Server (:50051)

| Method            | Description                    |
| ----------------- | ------------------------------ |
| GetAccount        | Get account by ID              |
| GetAccountByEmail | Get account by email           |
| ValidateAccount   | Check account status/existence |
| CreateSession     | Create new session (login)     |
| ValidateSession   | Validate session token         |
| RevokeSession     | Revoke session (logout)        |
| GetAccountDevices | List all devices for account   |
| TrustDevice       | Mark device as trusted         |

**Proto file**: `packages/proto/identity/v1/identity.proto`

## Database Tables

| Table         | Purpose                              |
| ------------- | ------------------------------------ |
| accounts      | Core identity data (email, username) |
| sessions      | Active user sessions                 |
| devices       | Registered user devices              |
| profiles      | User profile information             |
| outbox_events | Transactional outbox for events      |

## Events (Redpanda)

Events are published to `identity.*` topics:

```
ACCOUNT_CREATED   - New account registered
ACCOUNT_UPDATED   - Account details changed
ACCOUNT_DELETED   - Account removed

SESSION_STARTED   - User logged in
SESSION_REFRESHED - Token refreshed
SESSION_ENDED     - User logged out

DEVICE_REGISTERED - New device added
DEVICE_TRUSTED    - Device marked as trusted
DEVICE_REMOVED    - Device removed

MFA_ENABLED       - MFA activated
MFA_DISABLED      - MFA deactivated
```

## Cache Keys (Valkey)

| Key Pattern             | TTL     | Description                    |
| ----------------------- | ------- | ------------------------------ |
| `account:id:{id}`       | 5 min   | Account data by ID             |
| `account:email:{email}` | 5 min   | Account data by email          |
| `session:token:{hash}`  | 1 hour  | Session validation cache       |
| `revoked:jti:{jti}`     | 14 days | Revoked JWT tokens (blacklist) |

## Environment Variables

```bash
# REST API port
PORT=3005

# gRPC port for internal service communication
GRPC_PORT=50051

# PostgreSQL database connection
DATABASE_URL=postgresql://user:password@host:5432/identity_db

# Valkey (Redis-compatible) cache
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_DB=0

# JWT keys (RS256)
JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...

# Token expiration
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

---

**LLM Reference**: `docs/llm/services/identity-service.md`
