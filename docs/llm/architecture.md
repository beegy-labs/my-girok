# Architecture

## Services

| Service               | REST | gRPC  | DB               | Tables |
| --------------------- | ---- | ----- | ---------------- | ------ |
| identity-service      | 3000 | 50051 | identity_db      | ~8     |
| auth-service          | 3001 | 50052 | auth_db          | ~12    |
| legal-service         | 3005 | 50053 | legal_db         | ~10    |
| personal-service      | 3002 | -     | personal_db      | -      |
| audit-service         | 3010 | -     | ClickHouse       | -      |
| analytics-service     | 3011 | -     | ClickHouse       | -      |
| authorization-service | 3012 | 50055 | authorization_db | ~5     |

## Communication

| Direction       | Protocol |
| --------------- | -------- |
| Client→BFF      | GraphQL  |
| Client→Service  | REST     |
| BFF→Service     | gRPC     |
| Service→Service | gRPC     |
| Async           | Redpanda |

## Identity Platform

```
identity-service (identity_db)
├── accounts
├── sessions
├── devices
└── profiles

auth-service (auth_db)
├── roles
├── permissions
├── operators
└── sanctions

legal-service (legal_db)
├── consents
├── documents
├── law_registry
└── dsr_requests
```

## DB Functions (All DBs)

| Function                   | Purpose      |
| -------------------------- | ------------ |
| uuid_generate_v7()         | RFC 9562 ID  |
| update_updated_at_column() | Triggers     |
| outbox_events              | Event stream |

## Polyglot Persistence

| Service   | DB         | Reason        |
| --------- | ---------- | ------------- |
| identity  | PostgreSQL | ACID          |
| auth      | PostgreSQL | ACID          |
| legal     | PostgreSQL | ACID          |
| personal  | PostgreSQL | ACID          |
| feed      | MongoDB    | Flexible      |
| chat      | MongoDB    | Throughput    |
| matching  | Valkey     | Realtime      |
| audit     | ClickHouse | 5yr retention |
| analytics | ClickHouse | Analytics     |

## URLs (External)

| URL                 | Service      |
| ------------------- | ------------ |
| my-dev.girok.dev    | web-girok    |
| admin-dev.girok.dev | web-admin    |
| auth-dev.girok.dev  | auth-bff     |
| grpc-dev.girok.dev  | gRPC Gateway |

## Service Discovery (CoreDNS)

Multi-cluster ready domain structure:

| Pattern  | Example                      | Use Case                    |
| -------- | ---------------------------- | --------------------------- |
| External | `grpc-dev.girok.dev`         | Developer gRPC (L7 routing) |
| Internal | `identity.svc-dev.girok.dev` | Pod-to-Pod gRPC             |

### Internal gRPC Domains (Pod-to-Pod)

| Domain                     | Service                            | Port  |
| -------------------------- | ---------------------------------- | ----- |
| identity.svc-dev.girok.dev | platform-dev-identity-service      | 50051 |
| auth.svc-dev.girok.dev     | auth-service                       | 50052 |
| legal.svc-dev.girok.dev    | platform-dev-legal-service         | 50053 |
| audit.svc-dev.girok.dev    | platform-dev-audit-service         | 50054 |
| authz.svc-dev.girok.dev    | my-girok-dev-authorization-service | 50055 |

### gRPC Gateway (Developer Access)

```
grpc-dev.girok.dev:443
├── /identity.*      → identity-service:50051
├── /auth.*          → auth-service:50052
├── /legal.*         → legal-service:50053
├── /audit.*         → audit-service:50054
└── /authorization.* → authorization-service:50055
```

## Token Types

| Type            | Payload                            |
| --------------- | ---------------------------------- |
| USER_ACCESS     | services, countryCode, accountMode |
| ADMIN_ACCESS    | scope, permissions, level          |
| OPERATOR_ACCESS | serviceSlug, countryCode           |

## Guard Flow

```
Request → UnifiedAuthGuard
├─ USER_ACCESS → validateUser()
├─ ADMIN_ACCESS → validateAdmin()
└─ OPERATOR_ACCESS → validateOperator()
→ ServiceAccessGuard / CountryConsentGuard
```

## BFF Session

```typescript
ctx.res.cookie('session_id', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

## gRPC Call

```typescript
const user = await this.authGrpcClient.getUser({ userId });
```

## Event Publish

```typescript
await this.kafka.send({topic:'user.created',messages:[{value:JSON.stringify({userId,email})}]});

@KafkaSubscribe('user.created')
async handle(data: UserCreatedEvent) {}
```

## Laws

| Code | Country | Age |
| ---- | ------- | --- |
| PIPA | KR      | 14+ |
| GDPR | EU      | 16+ |
| CCPA | US      | 13+ |
| APPI | JP      | -   |

## Project Structure

```
apps/
├── web-girok/          # React 19.2
└── web-admin/
services/
├── identity-service/  # Port 3000
├── auth-service/      # Port 3001
├── legal-service/     # Port 3005
├── personal-service/  # Port 3002
├── audit-service/     # Port 3010
└── analytics-service/ # Port 3011
packages/
├── types/
└── nest-common/
```

## ID Strategy

```yaml
type: UUIDv7
spec: RFC 9562
feature: time-sortable
storage: native UUID
```
