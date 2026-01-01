# Architecture (2025)

> Hybrid: REST + gRPC + GraphQL | Identity Platform | Event-Driven

## Identity Platform Strategy

**Purpose**: Multi-app user management platform for creating N apps quickly.

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│identity-service │   │  auth-service   │   │  legal-service  │
│  (Accounts)     │   │    (Authz)      │   │   (Consent)     │
│                 │   │                 │   │                 │
│ • accounts      │   │ • roles         │   │ • consents      │
│ • sessions      │   │ • permissions   │   │ • legal_docs    │
│ • devices       │   │ • operators     │   │ • dsr_requests  │
│ • profiles      │   │ • sanctions     │   │ • law_registry  │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         ▼                     ▼                     ▼
  ┌────────────┐       ┌────────────┐        ┌────────────┐
  │identity_db │       │  auth_db   │        │  legal_db  │
  └────────────┘       └────────────┘        └────────────┘
```

**Key Principle**: Each service owns its domain + database (microservice architecture).

### Supported Apps

| App       | Domain        | Status  |
| --------- | ------------- | ------- |
| my-girok  | api.girok.dev | Active  |
| vero      | api.vero.dev  | Planned |
| future... | api.\*.dev    | -       |

### Global Law Coverage

| Code | Country | Key Requirements          |
| ---- | ------- | ------------------------- |
| PIPA | KR      | Age 14+, night push       |
| GDPR | EU      | Age 16+, data portability |
| CCPA | US      | Age 13+, opt-out          |
| APPI | JP      | Cross-border transfer     |

## Communication Strategy

| Direction         | Protocol | Use Case                   |
| ----------------- | -------- | -------------------------- |
| Client → BFF      | GraphQL  | Main API, flexible queries |
| Client → Service  | REST     | OAuth, simple APIs         |
| BFF → Service     | gRPC     | High-performance internal  |
| Service → Service | gRPC     | Internal communication     |
| Async Events      | Redpanda | Kafka-compatible, no JVM   |

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                   Cilium Gateway API                         │
│         (TLS, L7 routing, rate limiting, autoscaling)        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│ GraphQL BFF  │     │Identity Service│     │ WS Gateway   │
│  (Session)   │     │  (REST+gRPC)   │     │ (Socket.io)  │
└──────┬───────┘     └────────────────┘     └──────────────┘
       │ gRPC
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Domain Services (gRPC + Database)               │
│  Personal(PG)  Feed(Mongo)  Chat(Mongo)  Matching(Valkey)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
               ┌─────────────────────────┐
               │       Redpanda          │
               │  (Kafka API, no JVM)    │
               └─────────────────────────┘
```

## Full BFF Pattern (IETF)

```typescript
// Session-based auth - tokens NEVER exposed to browser
ctx.res.cookie('session_id', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

## Project Structure

```
my-girok/
├── apps/web-main/           # React 19.2 + Vite ✅
├── services/
│   ├── identity-service/    # REST ✅ (accounts, sessions, devices)
│   ├── auth-service/        # REST ✅ (roles, permissions, operators)
│   ├── legal-service/       # REST ✅ (consents, DSR)
│   ├── personal-service/    # REST ✅ | gRPC 🔲
│   ├── audit-service/       # REST ✅ (ClickHouse)
│   ├── analytics-service/   # REST ✅ (ClickHouse)
│   ├── graphql-bff/         # 🔲 Federation
│   └── ws-gateway/          # 🔲 Socket.io
└── packages/
    ├── types/               # ✅ Shared types
    └── nest-common/         # ✅ NestJS utilities
```

## Polyglot Persistence

| Service           | Database   | Reason                     |
| ----------------- | ---------- | -------------------------- |
| identity-service  | PostgreSQL | Core identity, ACID        |
| auth-service      | PostgreSQL | ACID, relations            |
| legal-service     | PostgreSQL | Compliance, audit trail    |
| personal-service  | PostgreSQL | Complex queries            |
| feed-service      | MongoDB    | Flexible schema            |
| chat-service      | MongoDB    | High write throughput      |
| matching-service  | Valkey     | In-memory, real-time       |
| audit-service     | ClickHouse | Time-series, 5yr retention |
| analytics-service | ClickHouse | High-volume analytics      |

## Observability Platform

```
Services ──OTEL──▶ OTEL Collector ──▶ ClickHouse
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                              ▼
            ┌─────────────┐                              ┌─────────────┐
            │  audit_db   │                              │analytics_db │
            │ (Compliance)│                              │ (Business)  │
            │ 5yr retain  │                              │ 90d-1yr     │
            └──────┬──────┘                              └──────┬──────┘
                   ▼                                            ▼
            audit-service                               analytics-service
```

| Database       | Tables                                      | Retention |
| -------------- | ------------------------------------------- | --------- |
| `audit_db`     | access_logs, consent_history, admin_actions | 5 years   |
| `analytics_db` | sessions, events, page_views, funnel_events | 90d-1yr   |

ID Strategy: **UUIDv7** (RFC 9562, time-sortable, DB-native UUID)

## Redpanda Events

```typescript
// Publish (Kafka-compatible API)
await this.kafka.send({
  topic: 'user.created',
  messages: [{ value: JSON.stringify({ userId, email }) }],
});

// Subscribe
@KafkaSubscribe('user.created')
async handleUserCreated(data: UserCreatedEvent) { }
```

> **Why Redpanda?** C++ native (no JVM), 1-2GB memory, ~1ms latency, Kafka API compatible

## Service Communication

```typescript
// DO: gRPC call
const user = await this.authGrpcClient.getUser({ userId });

// DO: Event publish (Redpanda/Kafka)
await this.kafka.send({ topic: 'post.created', messages: [{ value: postId }] });

// DON'T: Direct import
import { AuthService } from '../auth-service'; // NEVER
```

## URL Mapping

| URL                   | Service          | Status |
| --------------------- | ---------------- | ------ |
| my.girok.dev          | web-main         | ✅     |
| api.girok.dev/graphql | graphql-bff      | 🔲     |
| accounts.girok.dev    | identity-service | ✅     |
| auth.girok.dev        | auth-service     | ✅     |
| legal.girok.dev       | legal-service    | ✅     |
| ws.girok.dev          | ws-gateway       | 🔲     |

---

## Service Architecture

### Identity Platform (3 Services, 3 DBs)

```
identity-service → identity_db
├── accounts       # Core account lifecycle
├── sessions       # JWT token management
├── devices        # Device registration, trust
└── profiles       # User profile data

auth-service → auth_db
├── roles          # Role hierarchy, RBAC
├── permissions    # Permission definitions
├── operators      # Admin/operator management
├── sanctions      # User restrictions, bans
├── users          # Legacy user management
├── oauth-config   # OAuth providers
└── services       # Multi-service logic

legal-service → legal_db
├── consents       # Consent recording
├── legal_docs     # Terms, policies
├── dsr_requests   # Data subject requests
└── law_registry   # Jurisdiction requirements
```

### Service Responsibilities

| Service          | Domain                             | Communication |
| ---------------- | ---------------------------------- | ------------- |
| identity-service | Accounts, sessions, devices        | REST + gRPC   |
| auth-service     | Roles, permissions, operators      | REST + gRPC   |
| legal-service    | Consents, legal docs, DSR requests | REST + gRPC   |

### Token Types

| Type            | Payload                            | Use Case     |
| --------------- | ---------------------------------- | ------------ |
| USER_ACCESS     | services, countryCode, accountMode | User API     |
| ADMIN_ACCESS    | scope, permissions, level          | Admin API    |
| OPERATOR_ACCESS | serviceSlug, countryCode           | Operator API |

### Guard Flow

```
Request → UnifiedAuthGuard (routes by token type)
   │
   ├─ USER_ACCESS ──▶ validateUser()
   ├─ ADMIN_ACCESS ──▶ validateAdmin()
   └─ OPERATOR_ACCESS ──▶ validateOperator()
   │
   ▼
ServiceAccessGuard / CountryConsentGuard (optional)
```

---

## Security Patterns (2025)

### Token Revocation (RFC 9068)

JWT tokens can be revoked before expiry via JTI blacklist:

```typescript
// identity-service JwtAuthGuard
await jwtAuthGuard.revokeToken(jti, accountId, 'logout');
// Uses cache-aside: Redis (1h TTL) → DB fallback
```

### Password Hashing (OWASP 2024)

```typescript
// Argon2id (not bcrypt)
{
  memoryCost: 47104,  // 46 MiB
  timeCost: 1,
  parallelism: 1
}
```

### Permission Guard

```typescript
@Permissions('accounts:read')        // Specific permission
@RequireAnyPermission('*:read')      // Wildcard support
```

---

## Event Infrastructure

### Transactional Outbox + DLQ

```
Event Created → Outbox (5s polling) → Redpanda
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
      Success            Failed (5x)
         │                   │
         ▼                   ▼
    COMPLETED         Dead Letter Queue
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
            RETRIED    RESOLVED     IGNORED
               │           │           │
               ▼           │           │
            Reprocess   External    Obsolete
                          Fix        Data
```

### Saga Pattern (Distributed Transactions)

```typescript
const saga = await sagaOrchestrator.execute({
  sagaId: `registration-${accountId}`,
  steps: [
    { name: 'createAccount', execute, compensate },
    { name: 'createProfile', execute, compensate },
  ],
});
// Redis state store: 24h TTL (running), 1h TTL (completed)
```

---

**Service docs**: `.ai/services/identity-service.md`, `.ai/services/auth-service.md`, `.ai/services/legal-service.md`
**Full roadmap**: `docs/ARCHITECTURE_ROADMAP.md`
