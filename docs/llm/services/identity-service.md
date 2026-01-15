# identity-service

```yaml
port: 3005
grpc: 50051
db: identity_db (PostgreSQL)
cache: Valkey DB 7
events: identity.* (Redpanda)
codebase: services/identity-service/
```

## Boundaries

| Owns     | Not                 |
| -------- | ------------------- |
| Accounts | Roles/Permissions   |
| Sessions | Operators/Sanctions |
| Devices  | Consents/Documents  |
| Profiles | DSR Requests        |

## REST

```
POST/GET/PATCH/DELETE /accounts[/:id]
GET /accounts/by-email/:email
GET /accounts/by-username/:username
POST /accounts/:id/verify-email
POST /accounts/:id/change-password
POST /accounts/:id/mfa/enable|verify|disable

POST /sessions
GET /sessions[/:id]
POST /sessions/refresh|validate
DELETE /sessions/:id
DELETE /sessions/account/:accountId

POST/GET/PATCH/DELETE /devices[/:id]
POST /devices/:id/trust
GET/PATCH /profiles/:accountId
```

## gRPC (50051)

| Method            | Desc         |
| ----------------- | ------------ |
| GetAccount        | By ID        |
| GetAccountByEmail | By email     |
| ValidateAccount   | Check status |
| CreateSession     | Login        |
| ValidateSession   | Token check  |
| RevokeSession     | Logout       |
| GetAccountDevices | List devices |
| TrustDevice       | Mark trusted |

Proto: `packages/proto/identity/v1/identity.proto`

## Tables

| Table         | Purpose            |
| ------------- | ------------------ |
| accounts      | Core identity      |
| sessions      | Active sessions    |
| devices       | Registered devices |
| profiles      | User profiles      |
| outbox_events | Event outbox       |

## Events

```
ACCOUNT_CREATED|UPDATED|DELETED
SESSION_STARTED|REFRESHED|ENDED
DEVICE_REGISTERED|TRUSTED|REMOVED
MFA_ENABLED|DISABLED
```

## Cache

| Key                     | TTL |
| ----------------------- | --- |
| `account:id:{id}`       | 5m  |
| `account:email:{email}` | 5m  |
| `session:token:{hash}`  | 1h  |
| `revoked:jti:{jti}`     | 14d |

## Env

```bash
PORT=3005
GRPC_PORT=50051
DATABASE_URL=postgresql://...identity_db
VALKEY_HOST=localhost
JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...

# Kafka (SASL)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=identity-service
KAFKA_SASL_USERNAME=...
KAFKA_SASL_PASSWORD=...
KAFKA_SASL_MECHANISM=scram-sha-512
KAFKA_SSL=true
```

---

Full: `docs/en/services/IDENTITY_SERVICE.md`
