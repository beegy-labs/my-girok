# Architecture (2025)

> Hybrid: REST + gRPC + GraphQL | Identity Platform | Event-Driven

## Identity Platform Strategy

**Purpose**: Multi-app user management platform for creating N apps quickly.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   Identity Platform (Separated Services)                 │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ identity-service │  │  auth-service    │  │  legal-service   │       │
│  │    (Accounts)    │  │   (Authz/RBAC)   │  │   (Consent/DSR)  │       │
│  │                  │  │                  │  │                  │       │
│  │ • Accounts       │  │ • Roles          │  │ • Consents       │       │
│  │ • Sessions       │  │ • Permissions    │  │ • Documents      │       │
│  │ • Devices        │  │ • Operators      │  │ • Law Registry   │       │
│  │ • Profiles       │  │ • Sanctions      │  │ • DSR Requests   │       │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘       │
│           │                     │                     │                  │
└───────────┼─────────────────────┼─────────────────────┼──────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
     ┌────────────┐        ┌────────────┐        ┌────────────┐
     │identity_db │        │  auth_db   │        │  legal_db  │
     │   ~8 tbl   │        │   ~12 tbl  │        │   ~10 tbl  │
     └────────────┘        └────────────┘        └────────────┘
```

**Key Principle**: Domain-driven service separation with dedicated databases per domain.

### 3-DB SSOT: Shared Patterns

Each database contains **identical** infrastructure for service independence:

| Function                     | identity_db | auth_db | legal_db | Reason                    |
| ---------------------------- | ----------- | ------- | -------- | ------------------------- |
| `uuid_generate_v7()`         | ✅          | ✅      | ✅       | RFC 9562 time-sortable ID |
| `update_updated_at_column()` | ✅          | ✅      | ✅       | Self-contained triggers   |
| `outbox_events` table        | ✅          | ✅      | ✅       | Independent event streams |

**Why replicate?** Each service is independently deployable. No cross-DB dependencies ensures clean service boundaries.

### 3-DB SSOT: Intentional Duplication

Each database contains **intentionally duplicated** functions for Zero Migration:

| Function                     | identity_db | auth_db | legal_db | Reason                    |
| ---------------------------- | ----------- | ------- | -------- | ------------------------- |
| `uuid_generate_v7()`         | ✅          | ✅      | ✅       | No cross-DB dependency    |
| `update_updated_at_column()` | ✅          | ✅      | ✅       | Self-contained triggers   |
| `outbox_events` table        | ✅          | ✅      | ✅       | Independent event streams |

**Why duplicate?** When services are extracted (Phase 2), each DB must be self-sufficient. Cross-DB functions would create migration dependencies.

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
┌───────────────────────────────────────────────────────────────────────────┐
│                          Cilium Gateway API                                │
│            (TLS, L7 routing, rate limiting, autoscaling)                   │
└───────────────────────────────────────────────────────────────────────────┘
                                     │
     ┌───────────────────────────────┼───────────────────────────────┐
     ▼                               ▼                               ▼
┌──────────────┐            ┌──────────────┐                ┌──────────────┐
│ GraphQL BFF  │            │ REST Gateway │                │ WS Gateway   │
│  (Session)   │            │ (API routes) │                │ (Socket.io)  │
└──────┬───────┘            └──────┬───────┘                └──────────────┘
       │ gRPC                      │
       ▼                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                   Identity Platform (Separated Services)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │identity-service │  │  auth-service   │  │  legal-service  │            │
│  │   (identity_db) │  │   (auth_db)     │  │   (legal_db)    │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└───────────────────────────────────────────────────────────────────────────┘
                                     │ gRPC
                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    Domain Services (gRPC + Database)                       │
│   Personal(PG)   Feed(Mongo)   Chat(Mongo)   Matching(Valkey)             │
└───────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────┐
                      │        Redpanda         │
                      │   (Kafka API, no JVM)   │
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
├── apps/
│   ├── web-main/            # React 19.2 + Vite ✅
│   └── web-admin/           # Admin dashboard ✅
├── services/
│   ├── identity-service/    # REST ✅ (identity_db) Port 3000
│   ├── auth-service/        # REST ✅ (auth_db) Port 3001
│   ├── legal-service/       # REST ✅ (legal_db) Port 3005
│   ├── personal-service/    # REST ✅ | gRPC 🔲
│   ├── audit-service/       # REST ✅ (ClickHouse)
│   ├── analytics-service/   # REST ✅ (ClickHouse)
│   ├── graphql-bff/         # 🔲 Federation
│   └── ws-gateway/          # 🔲 Socket.io
└── packages/
    ├── types/               # ✅ Shared types (identity/, auth/, legal/)
    └── nest-common/         # ✅ NestJS utilities (UUIDv7, cache, etc.)
```

## Polyglot Persistence

| Service           | Database   | Schema/DB    | Reason                      |
| ----------------- | ---------- | ------------ | --------------------------- |
| identity-service  | PostgreSQL | identity_db  | Accounts, sessions, devices |
| auth-service      | PostgreSQL | auth_db      | RBAC, operators, sanctions  |
| legal-service     | PostgreSQL | legal_db     | Consents, documents, DSR    |
| personal-service  | PostgreSQL | personal_db  | Resume, profile data        |
| feed-service      | MongoDB    | -            | Flexible schema             |
| chat-service      | MongoDB    | -            | High write throughput       |
| matching-service  | Valkey     | -            | In-memory, real-time        |
| audit-service     | ClickHouse | audit_db     | Compliance, 5yr retention   |
| analytics-service | ClickHouse | analytics_db | Business analytics          |

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

| URL                       | Service          | Status |
| ------------------------- | ---------------- | ------ |
| my.girok.dev              | web-main         | ✅     |
| admin.girok.dev           | web-admin        | ✅     |
| my-api.girok.dev/identity | identity-service | ✅     |
| my-api.girok.dev/auth     | auth-service     | ✅     |
| my-api.girok.dev/legal    | legal-service    | ✅     |
| api.girok.dev/graphql     | graphql-bff      | 🔲     |
| ws.girok.dev              | ws-gateway       | 🔲     |

---

## Service Evolution

### Current State (Phase 3 - Separated Services)

```
Identity Platform (3 services, 3 DBs)
├── identity-service → identity_db
│   ├── accounts        # User accounts (UUIDv7)
│   ├── sessions        # Login sessions
│   ├── devices         # Device management
│   └── profiles        # User profiles
│
├── auth-service → auth_db
│   ├── roles           # RBAC roles
│   ├── permissions     # Fine-grained permissions
│   ├── operators       # Service operators
│   └── sanctions       # User/operator sanctions
│
└── legal-service → legal_db
    ├── consents        # User consent records
    ├── documents       # Legal documents (ToS, Privacy)
    ├── law_registry    # Country-specific laws
    └── dsr_requests    # Data Subject Requests (GDPR/PIPA)
```

### Evolution History

```
Phase 1 (Legacy)
└── auth-service: All-in-one (girok_auth_db)

Phase 2 (Transition)
└── identity-service: Combined service, 3 DBs

Phase 3 (Current) ✅
├── identity-service → identity_db (Port 3000)
├── auth-service → auth_db (Port 3001)
└── legal-service → legal_db (Port 3005)
```

### Inter-Service Communication

```
identity-service ←→ auth-service     # gRPC (permission checks)
identity-service ←→ legal-service    # gRPC (consent validation)
auth-service ←→ legal-service        # Events (Redpanda)
```

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

**Service Documentation:**

- Identity Service: `.ai/services/identity-service.md`
- Auth Service: `.ai/services/auth-service.md`
- Legal Service: `.ai/services/legal-service.md`

**Full roadmap**: `docs/ARCHITECTURE_ROADMAP.md`
**Platform policy**: `docs/policies/IDENTITY_PLATFORM.md`
