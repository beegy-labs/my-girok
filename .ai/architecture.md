# Architecture (2025)

> Hybrid: REST + gRPC + GraphQL | Identity Platform | Event-Driven

## Identity Platform Strategy

**Purpose**: Multi-app user management platform for creating N apps quickly.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Identity Service (Combined)                   │
│                                                                  │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│   │  Identity   │   │    Auth     │   │    Legal    │           │
│   │   Module    │   │   Module    │   │   Module    │           │
│   │ (Accounts)  │   │  (Authz)    │   │ (Consent)   │           │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘           │
└──────────┼─────────────────┼─────────────────┼───────────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │identity_db │    │  auth_db   │    │  legal_db  │
    │   ~15 tbl  │    │   ~20 tbl  │    │   ~12 tbl  │
    └────────────┘    └────────────┘    └────────────┘
```

**Key Principle**: Services combined (operational simplicity) + DBs pre-separated (future extraction).

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
│   ├── auth-service/        # REST ✅ | gRPC 🔲
│   ├── personal-service/    # REST ✅ | gRPC 🔲
│   ├── graphql-bff/         # 🔲 Federation
│   └── ws-gateway/          # 🔲 Socket.io
└── packages/
    ├── types/               # ✅ Shared types
    └── nest-common/         # ✅ NestJS utilities
```

## Polyglot Persistence

| Service           | Database   | Reason                     |
| ----------------- | ---------- | -------------------------- |
| auth-service      | PostgreSQL | ACID, relations            |
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
| accounts.girok.dev    | identity-service | 🔲     |
| auth.girok.dev        | auth-service     | ✅     |
| ws.girok.dev          | ws-gateway       | 🔲     |

---

## Service Evolution

### Current State (auth-service)

```
auth-service (1 service, 1 DB)
├── auth/           # Login, JWT
├── users/          # User management
├── oauth-config/   # OAuth providers
├── admin/          # Admin management
├── operator/       # Service operators
├── services/       # Multi-service logic
└── legal/          # Consent management
```

### Future State (identity-service)

```
identity-service (1 service, 3 DBs)
├── Identity Module → identity_db
│   ├── accounts, credentials, sessions
│   ├── devices, app_registry
│   └── OAuth, Passkeys
├── Auth Module → auth_db
│   ├── roles, permissions, admins
│   ├── operators, sanctions
│   └── api_keys
└── Legal Module → legal_db
    ├── laws, law_requirements
    ├── consent_documents
    └── account_consents, DSR
```

### Migration Path

```
Phase 1 (Current)
└── auth-service: All-in-one (girok_auth_db)

Phase 2 (Transition)
└── identity-service: Combined service, 3 DBs
    ├── identity_db
    ├── auth_db
    └── legal_db

Phase 3 (If needed)
├── identity-service → identity_db
├── auth-service → auth_db
└── legal-service → legal_db
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

**Identity Platform details**: `.ai/services/identity-service.md`
**Full roadmap**: `docs/ARCHITECTURE_ROADMAP.md`
